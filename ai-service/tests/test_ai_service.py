from fastapi.testclient import TestClient

from app.main import app
from app.schemas import GenerateResponse

client = TestClient(app)


def payload(path="reinforcement", mode="teacher_resource", question=None):
    return {
        "request_mode": mode,
        "subject": {"name": "Introducción a la programación"},
        "unit": {
            "id": "unit-ut2-python",
            "code": "UT2",
            "title": "Manipulación de datos con Python",
            "learning_outcome": "RA2. Escribe y depura código.",
            "evaluation_criteria": ["2.a) Uso de estructuras de selección.", "2.c) Estructuras de repetición."],
            "contents": ["Condicionales", "Bucles"],
        },
        "student_context": {
            "recommended_path": path,
            "prior_knowledge": "Puede seguir la secuencia ordinaria.",
            "autonomy_level": "Media",
            "support_needs": "Necesita apoyos puntuales.",
        },
        "learning_path": path,
        "resource_type": "practical_activity",
        "base_content": "Condicionales y bucles",
        "teacher_instructions": "Usa Python de consola",
        "question": question,
        "visible_materials": [{"title": "Guía estándar", "kind": "base"}],
    }


def fake_ollama_response(request):
    return GenerateResponse(
        title="Respuesta desde Ollama",
        summary="Resumen contextualizado",
        generated_content=f"Contenido para {request.request_mode} y {request.student_context.recommended_path}",
        adaptations={"learning_path": request.learning_path or request.student_context.recommended_path, "provider": "ollama"},
        key_points=["Módulo", "UT", "RA/CE"],
        worked_example="if nota >= 5: print('Apto')",
        comprehension_question="¿Qué estructura usarías?",
        detected_topic="conditionals",
    )


def test_health():
    response = client.get("/health").json()
    assert response["status"] == "ok"
    assert response["provider"] == "ollama"


def test_teacher_request_uses_ollama_contract(monkeypatch):
    import app.main as main

    monkeypatch.setattr(main, "generate_with_ollama", fake_ollama_response)
    response = client.post("/generate", json=payload("extension"))
    assert response.status_code == 200
    body = response.json()
    assert body["adaptations"]["provider"] == "ollama"
    assert body["generated_content"] == "Contenido para teacher_resource y extension"


def test_malformed_model_json_is_recovered():
    from app.ollama import _model_response_to_generate_response
    from app.schemas import GenerateRequest

    request = GenerateRequest.model_validate(payload(mode="student_resource", question="Hazme un audio explicativo"))
    malformed = '{"title":"Audio","summary":"Guion","generated_content":"Linea 1\nLinea 2 sin cerrar'

    result = _model_response_to_generate_response(malformed, request, "ollama", "gemma3:4b")

    assert result.adaptations["parse_recovered"] is True
    assert "Linea 2 sin cerrar" in result.generated_content
    assert result.adaptations["resource_type"] == "practical_activity"


def test_student_request_keeps_context_contract(monkeypatch):
    import app.main as main

    monkeypatch.setattr(main, "generate_with_ollama", fake_ollama_response)
    response = client.post("/generate", json=payload(mode="student_explanation", question="No entiendo while"))
    assert response.status_code == 200
    body = response.json()
    assert body["detected_topic"] == "conditionals"
    assert body["key_points"] == ["Módulo", "UT", "RA/CE"]
