import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, func


@pytest.fixture()
def client(monkeypatch, tmp_path):
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{path}")
    monkeypatch.setenv("AI_SERVICE_URL", "http://ai-service.test")
    monkeypatch.setenv("APP_ENV", "demo")
    monkeypatch.setenv("DEMO_RESET_ENABLED", "true")
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))

    from app import database
    from app.models import Base
    from app.seed import seed

    Base.metadata.drop_all(bind=database.engine)
    Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        seed(db)
    finally:
        db.close()

    from app.main import app

    async def async_fake(payload):
        if payload["request_mode"] == "student_explanation":
            return {
                "title": "Respuesta contextual",
                "summary": "Resumen",
                "generated_content": "Explicacion educativa contextualizada.",
                "key_points": ["Uno", "Dos"],
                "worked_example": "Ejemplo",
                "comprehension_question": "Pregunta",
                "detected_topic": "sgbd",
                "adaptations": {"learning_path": payload["student_context"]["recommended_path"]},
            }
        return {
            "title": "Recurso adaptado",
            "summary": "Resumen",
            "generated_content": "Contenido generado",
            "adaptations": {"learning_path": payload.get("learning_path")},
        }

    import app.main as main

    monkeypatch.setattr(main, "call_ai", async_fake)
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    assert client.get("/api/health").status_code == 200


def test_password_login(client):
    response = client.post("/api/auth/login", json={"username": "profesor", "password": "ritmia2026"})
    assert response.status_code == 200
    assert response.json()["role"] == "teacher"
    assert client.post("/api/auth/login", json={"username": "alumna.refuerzo", "password": "ritmia2026"}).json()["id"] == "student-marta-lopez-romero"
    assert client.post("/api/auth/login", json={"username": "alumna.estandar", "password": "ritmia2026"}).json()["id"] == "student-laura-garcia-morales"
    assert client.post("/api/auth/login", json={"username": "alumno.ampliacion", "password": "ritmia2026"}).json()["id"] == "student-sergio-lopez-campos"
    denied = client.post("/api/auth/login", json={"username": "profesor", "password": "incorrecta"})
    assert denied.status_code == 401


def test_mvp_seed_initial_state(client):
    subjects = client.get("/api/teacher/subjects?teacher_id=teacher-alvaro-aparicio").json()
    assert sorted(subject["id"] for subject in subjects) == sorted([
        "module-an4699-programacion",
        "module-0377-asgbd",
        "module-0379-proyecto-intermodular",
    ])
    assert len(client.get("/api/subjects/module-0377-asgbd/students").json()) == 22
    assert client.get("/api/subjects/module-0377-asgbd/units").json() == []
    context = client.get("/api/students/student-laura-garcia-morales/context?subject_id=module-0377-asgbd").json()
    assert context["recommended_path"] == "standard"


def test_create_unit_then_student_question(client):
    unit = client.post(
        "/api/modules/module-0377-asgbd/units",
        json={
            "code": "UT1",
            "title": "Instalacion y configuracion de un sistema gestor de base de datos",
            "description": "Unidad creada durante la demo.",
            "learning_outcome": "RA1",
            "evaluation_criteria": ["1.a", "1.b"],
            "contents": ["Instalacion", "Configuracion inicial"],
            "unit_order": 1,
            "created_by": "teacher-alvaro-aparicio",
        },
    ).json()
    response = client.post(
        "/api/student/modules/module-0377-asgbd/assistant?student_id=student-laura-garcia-morales",
        json={"unit_ids": [unit["id"]], "question": "¿Que es un SGBD?"},
    )
    assert response.status_code == 200
    assert response.json()["learning_path"] == "standard"


def test_student_can_generate_material_for_selected_unit(client):
    unit = client.post(
        "/api/modules/module-0377-asgbd/units",
        json={
            "code": "UT1",
            "title": "Instalacion y configuracion de un sistema gestor de base de datos",
            "description": "Unidad creada durante la demo.",
            "learning_outcome": "RA1",
            "evaluation_criteria": ["1.a", "1.b"],
            "contents": ["Instalacion", "Configuracion inicial"],
            "unit_order": 1,
            "created_by": "teacher-alvaro-aparicio",
        },
    ).json()
    material = client.post(
        "/api/modules/module-0377-asgbd/base-materials",
        json={
            "title": "Material base UT1 para generacion del alumno",
            "description": "Material estandar de prueba.",
            "material_type": "text",
            "text_content": "Contenido base para publicar la UT.",
            "uploaded_by": "teacher-alvaro-aparicio",
        },
    ).json()
    client.post(f"/api/modules/module-0377-asgbd/base-materials/{material['id']}/publish")
    client.post(
        f"/api/modules/module-0377-asgbd/units/{unit['id']}/base-materials",
        json={"base_material_id": material["id"]},
    )
    client.post(f"/api/modules/module-0377-asgbd/units/{unit['id']}/publish")
    response = client.post(
        "/api/student/modules/module-0377-asgbd/generated-materials?student_id=student-laura-garcia-morales",
        json={
            "unit_ids": [unit["id"]],
            "resource_type": "mind_map",
            "prompt": "Genera un mapa mental para repasar la unidad.",
        },
    )
    assert response.status_code == 200
    generated = response.json()
    assert generated["status"] == "published"
    assert generated["generated_by"] == "student-ai-service"
    materials = client.get(
        f"/api/student/modules/module-0377-asgbd/units/{unit['id']}/materials?student_id=student-laura-garcia-morales"
    ).json()
    assert any(resource["id"] == generated["id"] for resource in materials["adaptive_resources"])
    other_student_materials = client.get(
        f"/api/student/modules/module-0377-asgbd/units/{unit['id']}/materials?student_id=student-ana-romero-perez"
    ).json()
    assert all(resource["id"] != generated["id"] for resource in other_student_materials["adaptive_resources"])
    other_student_resources = client.get("/api/students/student-ana-romero-perez/resources?status=published").json()
    assert all(resource["id"] != generated["id"] for resource in other_student_resources)
    teacher_resources = client.get("/api/modules/module-0377-asgbd/generated-resources").json()
    assert all(resource["id"] != generated["id"] for resource in teacher_resources)


def test_teacher_can_generate_audio_resource(client):
    unit = client.post(
        "/api/modules/module-0377-asgbd/units",
        json={
            "code": "UT1",
            "title": "Instalacion y configuracion de un sistema gestor de base de datos",
            "description": "Unidad creada durante la demo.",
            "learning_outcome": "RA1",
            "evaluation_criteria": ["1.a", "1.b"],
            "contents": ["Instalacion", "Configuracion inicial"],
            "unit_order": 1,
            "created_by": "teacher-alvaro-aparicio",
        },
    ).json()
    material = client.post(
        "/api/modules/module-0377-asgbd/base-materials",
        json={
            "title": "Actividad_1.pdf",
            "description": "Material estandar de prueba.",
            "material_type": "pdf",
            "text_content": "Actividad base para generar un podcast.",
            "uploaded_by": "teacher-alvaro-aparicio",
        },
    ).json()
    client.post(f"/api/modules/module-0377-asgbd/base-materials/{material['id']}/publish")
    client.post(
        f"/api/modules/module-0377-asgbd/units/{unit['id']}/base-materials",
        json={"base_material_id": material["id"]},
    )
    response = client.post(
        "/api/adaptive-resources/generate",
        json={
            "teacher_id": "teacher-alvaro-aparicio",
            "module_id": "module-0377-asgbd",
            "unit_ids": [unit["id"]],
            "base_material_ids": [material["id"]],
            "learning_path": "reinforcement",
            "resource_type": "audio",
            "audience_type": "pathway",
            "student_ids": [],
            "teacher_instructions": "Explicacion detallada de los objetivos y tareas de la actividad 1",
        },
    )
    assert response.status_code == 200
    generated = response.json()
    assert generated["resource_type"] == "audio"
    assert generated["generated_by"] == "ai-service"
    assert generated["learning_path"] == "reinforcement"


def test_published_unit_is_visible_to_student(client):
    unit = client.post(
        "/api/modules/module-0377-asgbd/units",
        json={
            "code": "UT1",
            "title": "Unidad visible para alumnado",
            "description": "Unidad creada y publicada durante la prueba.",
            "learning_outcome": "RA1",
            "evaluation_criteria": ["1.a", "1.b"],
            "contents": ["Contenido inicial"],
            "unit_order": 1,
            "created_by": "teacher-alvaro-aparicio",
        },
    ).json()
    material = client.post(
        "/api/modules/module-0377-asgbd/base-materials",
        json={
            "title": "Material estandar UT visible",
            "description": "Material publicado para alumnado.",
            "material_type": "text",
            "text_content": "Contenido base.",
            "tags": [unit["id"], unit["code"], "standard"],
            "uploaded_by": "teacher-alvaro-aparicio",
        },
    ).json()
    client.post(f"/api/modules/module-0377-asgbd/base-materials/{material['id']}/publish")
    client.post(f"/api/modules/module-0377-asgbd/units/{unit['id']}/base-materials", json={"base_material_id": material["id"]})
    client.post(f"/api/modules/module-0377-asgbd/units/{unit['id']}/publish")

    units = client.get("/api/student/modules/module-0377-asgbd/units?student_id=student-laura-garcia-morales").json()
    assert any(item["id"] == unit["id"] for item in units)


def test_student_material_completion_updates_teacher_tracking(client):
    unit = client.post(
        "/api/modules/module-0377-asgbd/units",
        json={
            "code": "UT1",
            "title": "Unidad con seguimiento de progreso",
            "description": "Unidad publicada para comprobar avance del alumnado.",
            "learning_outcome": "RA1",
            "evaluation_criteria": ["1.a", "1.b"],
            "contents": ["Contenido inicial"],
            "unit_order": 1,
            "created_by": "teacher-alvaro-aparicio",
        },
    ).json()
    material = client.post(
        "/api/modules/module-0377-asgbd/base-materials",
        json={
            "title": "Actividad obligatoria UT1",
            "description": "Material obligatorio para alumnado de refuerzo.",
            "material_type": "text",
            "text_content": "Contenido base.",
            "uploaded_by": "teacher-alvaro-aparicio",
        },
    ).json()
    client.post(f"/api/modules/module-0377-asgbd/base-materials/{material['id']}/publish")
    client.post(f"/api/modules/module-0377-asgbd/units/{unit['id']}/base-materials", json={"base_material_id": material["id"]})
    client.post(f"/api/modules/module-0377-asgbd/units/{unit['id']}/publish")

    completed = client.put(
        f"/api/student/modules/module-0377-asgbd/units/{unit['id']}/materials/{material['id']}/completion"
        "?student_id=student-marta-lopez-romero",
        json={"material_kind": "base", "completed": True},
    )
    assert completed.status_code == 200
    assert completed.json()["completed"] is True

    tracking = client.get("/api/modules/module-0377-asgbd/students").json()
    marta = next(row for row in tracking if row["student"]["id"] == "student-marta-lopez-romero")
    assert marta["progress_percent"] == 100

    completed_records = client.get(
        "/api/students/student-marta-lopez-romero/material-completions?subject_id=module-0377-asgbd"
    ).json()
    assert any(item["material_id"] == material["id"] and item["completed"] for item in completed_records)

    cleared = client.put(
        f"/api/student/modules/module-0377-asgbd/units/{unit['id']}/materials/{material['id']}/completion"
        "?student_id=student-marta-lopez-romero",
        json={"material_kind": "base", "completed": False},
    )
    assert cleared.status_code == 200
    tracking = client.get("/api/modules/module-0377-asgbd/students").json()
    marta = next(row for row in tracking if row["student"]["id"] == "student-marta-lopez-romero")
    assert marta["progress_percent"] == 0


def test_curriculum_catalog_counts(client):
    from app import database
    from app.models import CurriculumEvaluationCriterion, CurriculumLearningOutcome, CurriculumUnitTemplate, LearningUnit

    db = database.SessionLocal()
    try:
        assert db.scalar(select(func.count()).select_from(CurriculumLearningOutcome)) == 14
        assert db.scalar(select(func.count()).select_from(CurriculumEvaluationCriterion)) == 106
        assert db.scalar(select(func.count()).select_from(CurriculumUnitTemplate)) == 14
        assert db.scalar(select(func.count()).select_from(LearningUnit)) == 0
    finally:
        db.close()


def test_reset_rejects_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("DEMO_RESET_ENABLED", "true")
    from app.scripts.reset_mvp_demo import reset

    with pytest.raises(SystemExit):
        reset(confirm=True)
