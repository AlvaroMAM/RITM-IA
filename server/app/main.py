from datetime import UTC, datetime
import logging
import os
from pathlib import Path
from uuid import uuid4

import httpx
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from .database import get_db
from .models import (
    BaseMaterial,
    Enrollment,
    GeneratedResource,
    GeneratedResourceAudience,
    GeneratedResourceSource,
    GeneratedResourceUnit,
    LearningUnit,
    LearningUnitBaseMaterial,
    MaterialConsultation,
    MaterialFeedback,
    PedagogicalAlert,
    ProjectIndicator,
    ResourceValidation,
    StudentContext,
    StudentExplanation,
    StudentMaterialCompletion,
    StudentMaterialSubmission,
    StudentPathHistory,
    StudentProgress,
    Subject,
    TeacherIntervention,
    TeacherSubject,
    User,
)
from .schemas import (
    AdaptiveGenerateRequest,
    BaseMaterialCreate,
    BaseMaterialOut,
    BaseMaterialPatch,
    ConsultationCreate,
    DemoLoginRequest,
    ExplanationCreate,
    ExplanationOut,
    FeedbackCreate,
    IndicatorOut,
    InterventionCreate,
    LoginRequest,
    ModuleSummary,
    PathChangeRequest,
    PathHistoryOut,
    ResourceValidationCreate,
    ResourceValidationOut,
    ResourceGenerateRequest,
    ResourceOut,
    ResourcePatch,
    SimpleRecordOut,
    StudentAssistantRequest,
    StudentContextOut,
    StudentContextUpdate,
    StudentGeneratedMaterialRequest,
    StudentMaterialCompletionOut,
    StudentMaterialCompletionUpdate,
    StudentMaterialSubmissionOut,
    StudentTrackingRow,
    SubjectOut,
    UnitCreate,
    UnitMaterialLinkCreate,
    UnitMaterialLinkPatch,
    UnitMaterialOut,
    UnitOut,
    UnitPatch,
    UnitReadiness,
    UserOut,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ritm-ia-server")

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8001")
AI_SERVICE_TIMEOUT_SECONDS = float(os.getenv("AI_SERVICE_TIMEOUT_SECONDS", "120"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
MAX_UPLOAD_SIZE = 50 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "audio/aac",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
    "audio/x-wav",
    "text/plain",
    "text/markdown",
    "text/x-python",
    "application/octet-stream",
}
ALLOWED_EXTENSIONS = {
    ".aac",
    ".css",
    ".doc",
    ".docx",
    ".html",
    ".jpeg",
    ".jpg",
    ".js",
    ".json",
    ".m4a",
    ".md",
    ".mp3",
    ".oga",
    ".ogg",
    ".pdf",
    ".png",
    ".py",
    ".ts",
    ".txt",
    ".wav",
    ".webm",
}

DEMO_CREDENTIALS = {
    "profesor": {"password": "ritmia2026", "user_id": "teacher-alvaro-aparicio"},
    "docente": {"password": "ritmia2026", "user_id": "teacher-alvaro-aparicio"},
    "alumno": {"password": "ritmia2026", "user_id": "student-laura-garcia-morales"},
    "laura": {"password": "ritmia2026", "user_id": "student-laura-garcia-morales"},
    "alumna.estandar": {"password": "ritmia2026", "user_id": "student-laura-garcia-morales"},
    "alumna.refuerzo": {"password": "ritmia2026", "user_id": "student-marta-lopez-romero"},
    "marta": {"password": "ritmia2026", "user_id": "student-marta-lopez-romero"},
    "alumno.ampliacion": {"password": "ritmia2026", "user_id": "student-sergio-lopez-campos"},
    "sergio": {"password": "ritmia2026", "user_id": "student-sergio-lopez-campos"},
}

app = FastAPI(title="RITM-IA API")


def now() -> datetime:
    return datetime.now(UTC)


def get_or_404(db: Session, model, id: str, message: str):
    obj = db.get(model, id)
    if obj is None:
        raise HTTPException(status_code=404, detail=message)
    return obj


def ensure_enrolled(db: Session, student_id: str, subject_id: str) -> None:
    exists = db.scalar(select(Enrollment).where(Enrollment.student_id == student_id, Enrollment.subject_id == subject_id))
    if not exists:
        raise HTTPException(status_code=403, detail="Student is not enrolled in this subject")


def context_for(db: Session, student_id: str, subject_id: str) -> StudentContext:
    ensure_enrolled(db, student_id, subject_id)
    context = db.scalar(select(StudentContext).where(StudentContext.student_id == student_id, StudentContext.subject_id == subject_id))
    if context is None:
        raise HTTPException(status_code=404, detail="Student context not found")
    return context


def teacher_has_module(db: Session, teacher_id: str, module_id: str) -> None:
    exists = db.scalar(select(TeacherSubject).where(TeacherSubject.teacher_id == teacher_id, TeacherSubject.subject_id == module_id))
    if not exists:
        raise HTTPException(status_code=403, detail="Teacher is not assigned to this module")


def teacher_id_for_module(db: Session, module_id: str) -> str:
    teacher_subject = db.scalar(select(TeacherSubject).where(TeacherSubject.subject_id == module_id).order_by(TeacherSubject.teacher_id))
    if teacher_subject:
        return teacher_subject.teacher_id
    teacher_user = db.scalar(select(User).where(User.role == "teacher").order_by(User.id))
    if teacher_user:
        return teacher_user.id
    raise HTTPException(status_code=404, detail="Teacher not found for module")


def unit_readiness(db: Session, unit: LearningUnit) -> UnitReadiness:
    missing: list[str] = []
    if not unit.subject_id:
        missing.append("módulo asociado")
    if not unit.code:
        missing.append("código")
    if not unit.title:
        missing.append("título")
    if not unit.description:
        missing.append("descripción")
    if not unit.learning_outcome:
        missing.append("resultado de aprendizaje")
    if not unit.evaluation_criteria:
        missing.append("criterios de evaluación")
    if not unit.contents:
        missing.append("contenidos")
    published_materials = db.scalars(
        select(BaseMaterial)
        .join(LearningUnitBaseMaterial, LearningUnitBaseMaterial.base_material_id == BaseMaterial.id)
        .where(LearningUnitBaseMaterial.learning_unit_id == unit.id, BaseMaterial.status == "published")
    ).all()
    if len(published_materials) == 0:
        missing.append("material base estándar publicado")
    status = "published" if unit.status == "published" else "ready_to_publish" if not missing else "incomplete"
    return UnitReadiness(status=status, missing=missing)


def ensure_unit_in_module(unit: LearningUnit, module_id: str) -> None:
    if unit.subject_id != module_id:
        raise HTTPException(status_code=400, detail="Unit does not belong to module")


def ensure_material_in_module(material: BaseMaterial, module_id: str) -> None:
    if material.subject_id != module_id:
        raise HTTPException(status_code=400, detail="Material does not belong to module")


def current_path_for(db: Session, student_id: str, module_id: str) -> str:
    context = context_for(db, student_id, module_id)
    return context.current_path or context.recommended_path


def resource_visible_for_student(db: Session, resource: GeneratedResource, student_id: str) -> bool:
    if resource.status != "published":
        return False
    if resource.generated_by == "student-ai-service":
        return resource.student_id == student_id
    if resource.student_id == student_id:
        return True
    audiences = db.scalars(select(GeneratedResourceAudience).where(GeneratedResourceAudience.generated_resource_id == resource.id)).all()
    for audience in audiences:
        if audience.audience_type == "student" and audience.student_id == student_id:
            return True
        if audience.audience_type == "pathway":
            path = current_path_for(db, student_id, resource.subject_id)
            if resource.learning_path == "standard":
                return True
            if audience.pathway == path and resource.learning_path == path:
                return True
    return resource.learning_path == "standard"


def ai_payload(subject: Subject, unit: LearningUnit, context: StudentContext, **extra):
    return {
        "subject": {"name": subject.name},
        "unit": {
            "id": unit.id,
            "code": unit.code,
            "title": unit.title,
            "learning_outcome": unit.learning_outcome,
            "evaluation_criteria": unit.evaluation_criteria,
            "contents": unit.contents,
        },
        "student_context": {
            "prior_knowledge": context.prior_knowledge,
            "recommended_path": context.recommended_path,
            "current_path": context.current_path,
            "autonomy_level": context.autonomy_level,
            "weekly_availability": context.weekly_availability,
            "support_needs": context.support_needs,
            "content_preferences": context.content_preferences,
            "detected_difficulties": context.detected_difficulties,
            "teacher_notes": context.teacher_notes,
        },
        **extra,
    }


def visible_materials_for_student_context(db: Session, units: list[LearningUnit], student_id: str) -> list[dict]:
    visible: list[dict] = []
    for unit in units:
        base_materials = db.scalars(
            select(BaseMaterial)
            .join(LearningUnitBaseMaterial, LearningUnitBaseMaterial.base_material_id == BaseMaterial.id)
            .where(LearningUnitBaseMaterial.learning_unit_id == unit.id, BaseMaterial.status == "published")
            .order_by(LearningUnitBaseMaterial.display_order)
        ).all()
        adaptive_resources = db.scalars(
            select(GeneratedResource)
            .join(GeneratedResourceUnit, GeneratedResourceUnit.generated_resource_id == GeneratedResource.id)
            .where(GeneratedResourceUnit.learning_unit_id == unit.id, GeneratedResourceUnit.is_published == True)  # noqa: E712
        ).all()
        visible_adaptive_resources = [resource for resource in adaptive_resources if resource_visible_for_student(db, resource, student_id)]
        visible.extend(
            {
                "id": material.id,
                "title": material.title,
                "type": material.material_type,
                "description": material.description,
                "content_reference": material.text_content or material.url or material.original_filename or "",
                "kind": "base",
                "unit": {"id": unit.id, "code": unit.code, "title": unit.title},
            }
            for material in base_materials
        )
        visible.extend(
            {
                "id": resource.id,
                "title": resource.title,
                "type": resource.resource_type,
                "description": resource.summary,
                "content_reference": resource.generated_content[:1500],
                "kind": "adaptive",
                "learning_path": resource.learning_path,
                "unit": {"id": unit.id, "code": unit.code, "title": unit.title},
            }
            for resource in visible_adaptive_resources
        )
    return visible


def material_for_student_unit(db: Session, module_id: str, unit_id: str, material_id: str, student_id: str) -> tuple[str, BaseMaterial | GeneratedResource]:
    unit = student_module_unit(module_id, unit_id, student_id, db)
    base_material = db.scalar(
        select(BaseMaterial)
        .join(LearningUnitBaseMaterial, LearningUnitBaseMaterial.base_material_id == BaseMaterial.id)
        .where(
            LearningUnitBaseMaterial.learning_unit_id == unit.id,
            BaseMaterial.id == material_id,
            BaseMaterial.status == "published",
        )
    )
    if base_material:
        return "base", base_material

    generated_resource = db.scalar(
        select(GeneratedResource)
        .join(GeneratedResourceUnit, GeneratedResourceUnit.generated_resource_id == GeneratedResource.id)
        .where(
            GeneratedResource.id == material_id,
            GeneratedResourceUnit.learning_unit_id == unit.id,
            GeneratedResourceUnit.is_published == True,  # noqa: E712
        )
    )
    if generated_resource and resource_visible_for_student(db, generated_resource, student_id):
        return "adaptive", generated_resource

    raise HTTPException(status_code=404, detail="Material not found")


def required_material_keys_for_student_unit(db: Session, module_id: str, unit_id: str, student_id: str) -> set[tuple[str, str]]:
    path = current_path_for(db, student_id, module_id)
    base_materials = db.scalars(
        select(BaseMaterial)
        .join(LearningUnitBaseMaterial, LearningUnitBaseMaterial.base_material_id == BaseMaterial.id)
        .where(
            LearningUnitBaseMaterial.learning_unit_id == unit_id,
            LearningUnitBaseMaterial.is_required == True,  # noqa: E712
            BaseMaterial.status == "published",
        )
    ).all()
    required: set[tuple[str, str]] = {("base", material.id) for material in base_materials}

    resources = db.scalars(
        select(GeneratedResource)
        .join(GeneratedResourceUnit, GeneratedResourceUnit.generated_resource_id == GeneratedResource.id)
        .where(
            GeneratedResourceUnit.learning_unit_id == unit_id,
            GeneratedResourceUnit.is_published == True,  # noqa: E712
            GeneratedResource.status == "published",
        )
    ).all()
    required.update(
        ("adaptive", resource.id)
        for resource in resources
        if resource.generated_by != "student-ai-service"
        and resource.learning_path == path
        and resource_visible_for_student(db, resource, student_id)
    )
    return required


def recalculate_student_unit_progress(db: Session, student_id: str, module_id: str, unit_id: str) -> StudentProgress:
    required_keys = required_material_keys_for_student_unit(db, module_id, unit_id, student_id)
    completions = db.scalars(
        select(StudentMaterialCompletion).where(
            StudentMaterialCompletion.student_id == student_id,
            StudentMaterialCompletion.subject_id == module_id,
            StudentMaterialCompletion.learning_unit_id == unit_id,
            StudentMaterialCompletion.completed == True,  # noqa: E712
        )
    ).all()
    completed_keys = {
        (completion.material_kind, completion.material_id)
        for completion in completions
        if (completion.material_kind, completion.material_id) in required_keys
    }
    progress_percent = round((len(completed_keys) / len(required_keys)) * 100) if required_keys else 0
    progress = db.scalar(
        select(StudentProgress).where(
            StudentProgress.student_id == student_id,
            StudentProgress.subject_id == module_id,
            StudentProgress.learning_unit_id == unit_id,
        )
    )
    if progress is None:
        progress = StudentProgress(
            id=f"progress-{uuid4()}",
            student_id=student_id,
            subject_id=module_id,
            learning_unit_id=unit_id,
        )
        db.add(progress)
    progress.activities_completed = len(completed_keys)
    progress.progress_percent = progress_percent
    progress.updated_at = now()
    return progress


async def call_ai(payload: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=AI_SERVICE_TIMEOUT_SECONDS) as client:
            response = await client.post(f"{AI_SERVICE_URL}/generate", json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        logger.exception("ai-service HTTPStatusError: %s", exc)
        detail = None
        try:
            detail = exc.response.json().get("detail")
        except Exception:
            pass
        raise HTTPException(
            status_code=exc.response.status_code if exc.response.status_code >= 400 else 503,
            detail=detail or "ai-service no disponible",
        ) from exc
    except httpx.HTTPError as exc:
        logger.exception("ai-service unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="ai-service no disponible") from exc


@app.get("/api/health")
async def health(db: Session = Depends(get_db)) -> dict:
    db.execute(text("select 1"))
    ai_status = "unavailable"
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            response = await client.get(f"{AI_SERVICE_URL}/health")
            ai_status = "ok" if response.status_code == 200 else "unavailable"
    except httpx.HTTPError:
        ai_status = "unavailable"
    return {"status": "ok", "db": "ok", "ai_service": ai_status}


@app.get("/api/demo/users", response_model=list[UserOut])
def demo_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.role, User.name)).all()


@app.post("/api/demo/login", response_model=UserOut)
def demo_login(payload: DemoLoginRequest, db: Session = Depends(get_db)):
    if payload.user_id:
        return get_or_404(db, User, payload.user_id, "User not found")
    role = payload.role or "student"
    user = db.scalar(select(User).where(User.role == role).order_by(User.name))
    if user is None:
        raise HTTPException(status_code=404, detail="Demo user not found")
    return user


@app.post("/api/auth/login", response_model=UserOut)
def password_login(payload: LoginRequest, db: Session = Depends(get_db)):
    username = payload.username.strip().lower()
    credential = DEMO_CREDENTIALS.get(username)
    if not credential:
        user_by_email = db.scalar(select(User).where(User.email == username))
        if user_by_email:
            credential = next((item for item in DEMO_CREDENTIALS.values() if item["user_id"] == user_by_email.id), None)
    if not credential or credential["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    return get_or_404(db, User, credential["user_id"], "User not found")


@app.get("/api/teacher/subjects", response_model=list[SubjectOut])
def teacher_subjects(teacher_id: str = Query("teacher-alvaro-aparicio"), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Subject)
        .join(TeacherSubject, TeacherSubject.subject_id == Subject.id)
        .where(TeacherSubject.teacher_id == teacher_id)
    ).all()
    return rows


@app.get("/api/teacher/modules", response_model=list[SubjectOut])
def teacher_modules(teacher_id: str = Query("teacher-alvaro-aparicio"), db: Session = Depends(get_db)):
    return teacher_subjects(teacher_id, db)


@app.get("/api/modules/{module_id}", response_model=SubjectOut)
def module_detail(module_id: str, db: Session = Depends(get_db)):
    return get_or_404(db, Subject, module_id, "Module not found")


@app.get("/api/modules/{module_id}/summary", response_model=ModuleSummary)
def module_summary(module_id: str, db: Session = Depends(get_db)):
    module = get_or_404(db, Subject, module_id, "Module not found")
    units = db.scalars(select(LearningUnit).where(LearningUnit.subject_id == module_id)).all()
    return ModuleSummary(
        module=module,
        units_count=len(units),
        published_units_count=len([unit for unit in units if unit.status == "published"]),
        base_materials_count=len(db.scalars(select(BaseMaterial).where(BaseMaterial.subject_id == module_id)).all()),
        generated_resources_count=len(
            db.scalars(
                select(GeneratedResource).where(
                    GeneratedResource.subject_id == module_id,
                    GeneratedResource.generated_by == "ai-service",
                )
            ).all()
        ),
        students_count=len(db.scalars(select(Enrollment).where(Enrollment.subject_id == module_id)).all()),
    )


@app.get("/api/modules/{module_id}/units", response_model=list[UnitOut])
def module_units(module_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Subject, module_id, "Module not found")
    return db.scalars(
        select(LearningUnit)
        .where(LearningUnit.subject_id == module_id, LearningUnit.status != "archived")
        .order_by(LearningUnit.unit_order)
    ).all()


@app.post("/api/modules/{module_id}/units", response_model=UnitOut)
def create_unit(module_id: str, payload: UnitCreate, db: Session = Depends(get_db)):
    get_or_404(db, Subject, module_id, "Module not found")
    teacher_has_module(db, payload.created_by, module_id)
    unit = LearningUnit(id=f"unit-{uuid4()}", subject_id=module_id, status="draft", **payload.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@app.get("/api/modules/{module_id}/units/{unit_id}", response_model=UnitOut)
def module_unit(module_id: str, unit_id: str, db: Session = Depends(get_db)):
    unit = get_or_404(db, LearningUnit, unit_id, "Unit not found")
    ensure_unit_in_module(unit, module_id)
    return unit


@app.patch("/api/modules/{module_id}/units/{unit_id}", response_model=UnitOut)
def patch_unit(module_id: str, unit_id: str, payload: UnitPatch, db: Session = Depends(get_db)):
    unit = module_unit(module_id, unit_id, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(unit, key, value)
    unit.updated_at = now()
    db.commit()
    db.refresh(unit)
    return unit


@app.delete("/api/modules/{module_id}/units/{unit_id}")
def delete_unit(module_id: str, unit_id: str, db: Session = Depends(get_db)):
    unit = module_unit(module_id, unit_id, db)
    unit.status = "archived"
    unit.updated_at = now()
    db.commit()
    return {"status": "archived"}


@app.post("/api/modules/{module_id}/units/{unit_id}/duplicate", response_model=UnitOut)
def duplicate_unit(module_id: str, unit_id: str, db: Session = Depends(get_db)):
    unit = module_unit(module_id, unit_id, db)
    duplicate = LearningUnit(
        id=f"unit-{uuid4()}",
        subject_id=module_id,
        code=f"{unit.code}-copia",
        title=f"Copia de {unit.title}",
        description=unit.description,
        learning_outcome=unit.learning_outcome,
        evaluation_criteria=unit.evaluation_criteria,
        contents=unit.contents,
        unit_order=unit.unit_order + 1,
        status="draft",
        created_by=unit.created_by,
    )
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)
    return duplicate


@app.post("/api/modules/{module_id}/units/reorder", response_model=list[UnitOut])
def reorder_units(module_id: str, ordered_ids: list[str], db: Session = Depends(get_db)):
    get_or_404(db, Subject, module_id, "Module not found")
    for index, unit_id in enumerate(ordered_ids, start=1):
        unit = module_unit(module_id, unit_id, db)
        unit.unit_order = index
    db.commit()
    return module_units(module_id, db)


@app.get("/api/modules/{module_id}/units/{unit_id}/readiness", response_model=UnitReadiness)
def get_unit_readiness(module_id: str, unit_id: str, db: Session = Depends(get_db)):
    unit = module_unit(module_id, unit_id, db)
    return unit_readiness(db, unit)


@app.post("/api/modules/{module_id}/units/{unit_id}/publish", response_model=UnitOut)
def publish_unit(module_id: str, unit_id: str, db: Session = Depends(get_db)):
    unit = module_unit(module_id, unit_id, db)
    readiness = unit_readiness(db, unit)
    if readiness.missing:
        raise HTTPException(status_code=409, detail={"missing": readiness.missing})
    unit.status = "published"
    unit.published_at = now()
    db.commit()
    db.refresh(unit)
    return unit


@app.post("/api/modules/{module_id}/units/{unit_id}/unpublish", response_model=UnitOut)
def unpublish_unit(module_id: str, unit_id: str, db: Session = Depends(get_db)):
    unit = module_unit(module_id, unit_id, db)
    unit.status = "draft"
    unit.published_at = None
    db.commit()
    db.refresh(unit)
    return unit


@app.get("/api/modules/{module_id}/base-materials", response_model=list[BaseMaterialOut])
def base_materials(module_id: str, unit_ids: list[str] | None = Query(None), db: Session = Depends(get_db)):
    get_or_404(db, Subject, module_id, "Module not found")
    if unit_ids:
        return db.scalars(
            select(BaseMaterial)
            .join(LearningUnitBaseMaterial, LearningUnitBaseMaterial.base_material_id == BaseMaterial.id)
            .where(BaseMaterial.subject_id == module_id, LearningUnitBaseMaterial.learning_unit_id.in_(unit_ids))
            .order_by(BaseMaterial.created_at.desc())
        ).all()
    return db.scalars(select(BaseMaterial).where(BaseMaterial.subject_id == module_id).order_by(BaseMaterial.created_at.desc())).all()


@app.post("/api/modules/{module_id}/base-materials", response_model=BaseMaterialOut)
def create_base_material(module_id: str, payload: BaseMaterialCreate, db: Session = Depends(get_db)):
    get_or_404(db, Subject, module_id, "Module not found")
    material = BaseMaterial(id=f"material-{uuid4()}", subject_id=module_id, status="draft", **payload.model_dump())
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@app.get("/api/modules/{module_id}/base-materials/{material_id}", response_model=BaseMaterialOut)
def get_base_material(module_id: str, material_id: str, db: Session = Depends(get_db)):
    material = get_or_404(db, BaseMaterial, material_id, "Material not found")
    ensure_material_in_module(material, module_id)
    return material


@app.patch("/api/modules/{module_id}/base-materials/{material_id}", response_model=BaseMaterialOut)
def patch_base_material(module_id: str, material_id: str, payload: BaseMaterialPatch, db: Session = Depends(get_db)):
    material = get_base_material(module_id, material_id, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(material, key, value)
    material.version += 1
    material.updated_at = now()
    db.commit()
    db.refresh(material)
    return material


@app.post("/api/modules/{module_id}/base-materials/{material_id}/publish", response_model=BaseMaterialOut)
def publish_base_material(module_id: str, material_id: str, db: Session = Depends(get_db)):
    material = get_base_material(module_id, material_id, db)
    material.status = "published"
    material.published_at = now()
    db.commit()
    db.refresh(material)
    return material


@app.post("/api/modules/{module_id}/base-materials/{material_id}/unpublish", response_model=BaseMaterialOut)
def unpublish_base_material(module_id: str, material_id: str, db: Session = Depends(get_db)):
    material = get_base_material(module_id, material_id, db)
    material.status = "draft"
    material.published_at = None
    db.commit()
    db.refresh(material)
    return material


@app.post("/api/modules/{module_id}/base-materials/{material_id}/archive", response_model=BaseMaterialOut)
def archive_base_material(module_id: str, material_id: str, db: Session = Depends(get_db)):
    material = get_base_material(module_id, material_id, db)
    material.status = "archived"
    db.commit()
    db.refresh(material)
    return material


@app.delete("/api/modules/{module_id}/base-materials/{material_id}")
def delete_base_material(module_id: str, material_id: str, db: Session = Depends(get_db)):
    material = get_base_material(module_id, material_id, db)
    links = db.scalars(select(LearningUnitBaseMaterial).where(LearningUnitBaseMaterial.base_material_id == material.id)).all()
    for link in links:
        db.delete(link)
    source_links = db.scalars(select(GeneratedResourceSource).where(GeneratedResourceSource.base_material_id == material.id)).all()
    for link in source_links:
        db.delete(link)
    db.flush()
    if material.file_path:
        path = (UPLOAD_DIR / material.file_path).resolve()
        if str(path).startswith(str(UPLOAD_DIR.resolve())) and path.exists():
            path.unlink()
    db.delete(material)
    db.commit()
    return {"status": "deleted"}


@app.post("/api/modules/{module_id}/base-materials/{material_id}/upload", response_model=BaseMaterialOut)
async def upload_base_material_file(module_id: str, material_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    material = get_base_material(module_id, material_id, db)
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File extension not allowed")
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="MIME type not allowed")
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    internal_name = f"{uuid4()}{suffix}"
    target = UPLOAD_DIR / internal_name
    target.write_bytes(content)
    material.file_path = internal_name
    material.original_filename = file.filename
    material.mime_type = file.content_type
    material.file_size = len(content)
    material.version += 1
    db.commit()
    db.refresh(material)
    return material


@app.get("/api/modules/{module_id}/base-materials/{material_id}/download")
def download_base_material(module_id: str, material_id: str, db: Session = Depends(get_db)):
    material = get_base_material(module_id, material_id, db)
    if not material.file_path:
        raise HTTPException(status_code=404, detail="Material has no file")
    path = (UPLOAD_DIR / material.file_path).resolve()
    if not str(path).startswith(str(UPLOAD_DIR.resolve())) or not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type=material.mime_type, filename=material.original_filename)


@app.get("/api/modules/{module_id}/units/{unit_id}/base-materials", response_model=list[BaseMaterialOut])
def unit_base_materials(module_id: str, unit_id: str, db: Session = Depends(get_db)):
    unit = module_unit(module_id, unit_id, db)
    return db.scalars(
        select(BaseMaterial)
        .join(LearningUnitBaseMaterial, LearningUnitBaseMaterial.base_material_id == BaseMaterial.id)
        .where(LearningUnitBaseMaterial.learning_unit_id == unit.id)
        .order_by(LearningUnitBaseMaterial.display_order)
    ).all()


@app.post("/api/modules/{module_id}/units/{unit_id}/base-materials", response_model=UnitMaterialOut)
def link_unit_material(module_id: str, unit_id: str, payload: UnitMaterialLinkCreate, db: Session = Depends(get_db)):
    unit = module_unit(module_id, unit_id, db)
    material = get_base_material(module_id, payload.base_material_id, db)
    ensure_unit_in_module(unit, material.subject_id)
    link = LearningUnitBaseMaterial(
        id=f"unit-material-{uuid4()}",
        learning_unit_id=unit.id,
        base_material_id=material.id,
        display_order=payload.display_order,
        is_required=payload.is_required,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return {**link.__dict__, "material": material}


@app.patch("/api/modules/{module_id}/units/{unit_id}/base-materials/{material_id}", response_model=UnitMaterialOut)
def patch_unit_material(module_id: str, unit_id: str, material_id: str, payload: UnitMaterialLinkPatch, db: Session = Depends(get_db)):
    module_unit(module_id, unit_id, db)
    link = db.scalar(
        select(LearningUnitBaseMaterial).where(
            LearningUnitBaseMaterial.learning_unit_id == unit_id,
            LearningUnitBaseMaterial.base_material_id == material_id,
        )
    )
    if not link:
        raise HTTPException(status_code=404, detail="Association not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(link, key, value)
    db.commit()
    db.refresh(link)
    return link


@app.delete("/api/modules/{module_id}/units/{unit_id}/base-materials/{material_id}")
def unlink_unit_material(module_id: str, unit_id: str, material_id: str, db: Session = Depends(get_db)):
    module_unit(module_id, unit_id, db)
    link = db.scalar(
        select(LearningUnitBaseMaterial).where(
            LearningUnitBaseMaterial.learning_unit_id == unit_id,
            LearningUnitBaseMaterial.base_material_id == material_id,
        )
    )
    if not link:
        raise HTTPException(status_code=404, detail="Association not found")
    db.delete(link)
    db.commit()
    return {"status": "deleted"}


@app.get("/api/subjects/{subject_id}", response_model=SubjectOut)
def subject(subject_id: str, db: Session = Depends(get_db)):
    return get_or_404(db, Subject, subject_id, "Subject not found")


@app.get("/api/subjects/{subject_id}/units", response_model=list[UnitOut])
def subject_units(subject_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Subject, subject_id, "Subject not found")
    return db.scalars(select(LearningUnit).where(LearningUnit.subject_id == subject_id).order_by(LearningUnit.unit_order)).all()


@app.get("/api/units/{unit_id}", response_model=UnitOut)
def unit(unit_id: str, db: Session = Depends(get_db)):
    return get_or_404(db, LearningUnit, unit_id, "Unit not found")


@app.get("/api/subjects/{subject_id}/students", response_model=list[UserOut])
def subject_students(subject_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Subject, subject_id, "Subject not found")
    return db.scalars(
        select(User)
        .join(Enrollment, Enrollment.student_id == User.id)
        .where(Enrollment.subject_id == subject_id)
        .order_by(User.name)
    ).all()


@app.get("/api/modules/{module_id}/students", response_model=list[StudentTrackingRow])
def module_students_tracking(module_id: str, db: Session = Depends(get_db)):
    students = subject_students(module_id, db)
    units = db.scalars(
        select(LearningUnit)
        .where(LearningUnit.subject_id == module_id, LearningUnit.status == "published")
        .order_by(LearningUnit.unit_order)
    ).all()
    rows: list[StudentTrackingRow] = []
    for student_user in students:
        context = context_for(db, student_user.id, module_id)
        questions_count = len(
            db.scalars(select(StudentExplanation).where(StudentExplanation.student_id == student_user.id, StudentExplanation.subject_id == module_id)).all()
        )
        consultations_count = len(
            db.scalars(select(MaterialConsultation).where(MaterialConsultation.student_id == student_user.id, MaterialConsultation.subject_id == module_id)).all()
        )
        progresses = db.scalars(select(StudentProgress).where(StudentProgress.student_id == student_user.id, StudentProgress.subject_id == module_id)).all()
        progress_by_unit = {item.learning_unit_id: item.progress_percent for item in progresses}
        progress_percent = (
            round(sum(progress_by_unit.get(unit.id, 0) for unit in units) / len(units))
            if units
            else round(sum(item.progress_percent for item in progresses) / len(progresses)) if progresses else 0
        )
        alerts_count = len(
            db.scalars(
                select(PedagogicalAlert).where(
                    PedagogicalAlert.student_id == student_user.id,
                    PedagogicalAlert.subject_id == module_id,
                    PedagogicalAlert.status == "open",
                )
            ).all()
        )
        rows.append(
            StudentTrackingRow(
                student=student_user,
                current_path=context.current_path,
                recommended_path=context.recommended_path,
                last_activity="Datos demo: hace 1 día" if consultations_count or questions_count else "Sin actividad reciente",
                materials_consulted=consultations_count,
                questions_count=questions_count,
                progress_percent=progress_percent,
                alerts_count=alerts_count,
            )
        )
    return rows


@app.get("/api/modules/{module_id}/students/{student_id}", response_model=UserOut)
def module_student(module_id: str, student_id: str, db: Session = Depends(get_db)):
    ensure_enrolled(db, student_id, module_id)
    return student(student_id, db)


@app.get("/api/modules/{module_id}/students/{student_id}/context", response_model=StudentContextOut)
def module_student_context(module_id: str, student_id: str, db: Session = Depends(get_db)):
    return context_for(db, student_id, module_id)


@app.patch("/api/modules/{module_id}/students/{student_id}/context", response_model=StudentContextOut)
def patch_module_student_context(module_id: str, student_id: str, payload: StudentContextUpdate, db: Session = Depends(get_db)):
    return update_context(student_id, module_id, payload, db)


@app.post("/api/modules/{module_id}/students/{student_id}/change-path", response_model=PathHistoryOut)
def change_student_path(module_id: str, student_id: str, payload: PathChangeRequest, db: Session = Depends(get_db)):
    context = context_for(db, student_id, module_id)
    previous_path = context.current_path
    context.current_path = payload.new_path
    context.updated_at = now()
    history = StudentPathHistory(
        id=f"path-history-{uuid4()}",
        student_id=student_id,
        subject_id=module_id,
        previous_path=previous_path,
        new_path=payload.new_path,
        reason=payload.reason,
        teacher_id=payload.teacher_id,
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


@app.get("/api/modules/{module_id}/students/{student_id}/path-history", response_model=list[PathHistoryOut])
def student_path_history(module_id: str, student_id: str, db: Session = Depends(get_db)):
    ensure_enrolled(db, student_id, module_id)
    return db.scalars(
        select(StudentPathHistory)
        .where(StudentPathHistory.student_id == student_id, StudentPathHistory.subject_id == module_id)
        .order_by(StudentPathHistory.created_at.desc())
    ).all()


@app.get("/api/modules/{module_id}/students/{student_id}/consultations")
def student_consultations(module_id: str, student_id: str, db: Session = Depends(get_db)):
    ensure_enrolled(db, student_id, module_id)
    return db.scalars(
        select(MaterialConsultation)
        .where(MaterialConsultation.student_id == student_id, MaterialConsultation.subject_id == module_id)
        .order_by(MaterialConsultation.started_at.desc())
    ).all()


@app.get("/api/modules/{module_id}/students/{student_id}/questions", response_model=list[ExplanationOut])
def student_questions(module_id: str, student_id: str, db: Session = Depends(get_db)):
    ensure_enrolled(db, student_id, module_id)
    return db.scalars(
        select(StudentExplanation)
        .where(StudentExplanation.student_id == student_id, StudentExplanation.subject_id == module_id)
        .order_by(StudentExplanation.created_at.desc())
    ).all()


@app.get("/api/modules/{module_id}/students/{student_id}/progress")
def student_progress(module_id: str, student_id: str, db: Session = Depends(get_db)):
    ensure_enrolled(db, student_id, module_id)
    return db.scalars(select(StudentProgress).where(StudentProgress.student_id == student_id, StudentProgress.subject_id == module_id)).all()


@app.get("/api/modules/{module_id}/students/{student_id}/interventions")
def student_interventions(module_id: str, student_id: str, db: Session = Depends(get_db)):
    ensure_enrolled(db, student_id, module_id)
    return db.scalars(
        select(TeacherIntervention)
        .where(TeacherIntervention.student_id == student_id, TeacherIntervention.subject_id == module_id)
        .order_by(TeacherIntervention.created_at.desc())
    ).all()


@app.get("/api/modules/{module_id}/students/{student_id}/detail")
def module_student_detail(module_id: str, student_id: str, db: Session = Depends(get_db)):
    ensure_enrolled(db, student_id, module_id)
    subject = get_or_404(db, Subject, module_id, "Subject not found")
    student_user = student(student_id, db)
    context = context_for(db, student_id, module_id)
    units = db.scalars(select(LearningUnit).where(LearningUnit.subject_id == module_id).order_by(LearningUnit.unit_order)).all()
    unit_by_id = {unit.id: unit for unit in units}

    enrolled_modules = db.scalars(
        select(Subject)
        .join(Enrollment, Enrollment.subject_id == Subject.id)
        .where(Enrollment.student_id == student_id)
        .order_by(Subject.name)
    ).all()
    progresses = db.scalars(
        select(StudentProgress)
        .where(StudentProgress.student_id == student_id, StudentProgress.subject_id == module_id)
        .order_by(StudentProgress.updated_at.desc())
    ).all()
    consultations = db.scalars(
        select(MaterialConsultation)
        .where(MaterialConsultation.student_id == student_id, MaterialConsultation.subject_id == module_id)
        .order_by(MaterialConsultation.started_at.desc())
    ).all()
    material_ids = [item.material_id for item in consultations if item.material_kind == "base"]
    resource_ids = [item.material_id for item in consultations if item.material_kind == "adaptive"]
    materials = {item.id: item for item in db.scalars(select(BaseMaterial).where(BaseMaterial.id.in_(material_ids))).all()} if material_ids else {}
    generated_by_id = {item.id: item for item in db.scalars(select(GeneratedResource).where(GeneratedResource.id.in_(resource_ids))).all()} if resource_ids else {}
    questions = db.scalars(
        select(StudentExplanation)
        .where(StudentExplanation.student_id == student_id, StudentExplanation.subject_id == module_id)
        .order_by(StudentExplanation.created_at.desc())
    ).all()
    path_history = db.scalars(
        select(StudentPathHistory)
        .where(StudentPathHistory.student_id == student_id, StudentPathHistory.subject_id == module_id)
        .order_by(StudentPathHistory.created_at.desc())
    ).all()
    alerts = db.scalars(
        select(PedagogicalAlert)
        .where(PedagogicalAlert.student_id == student_id, PedagogicalAlert.subject_id == module_id)
        .order_by(PedagogicalAlert.created_at.desc())
    ).all()
    interventions = db.scalars(
        select(TeacherIntervention)
        .where(TeacherIntervention.student_id == student_id, TeacherIntervention.subject_id == module_id)
        .order_by(TeacherIntervention.created_at.desc())
    ).all()
    feedback = db.scalars(select(MaterialFeedback).where(MaterialFeedback.student_id == student_id).order_by(MaterialFeedback.created_at.desc())).all()
    submissions = db.scalars(
        select(StudentMaterialSubmission)
        .where(StudentMaterialSubmission.student_id == student_id, StudentMaterialSubmission.subject_id == module_id)
        .order_by(StudentMaterialSubmission.submitted_at.desc())
    ).all()
    resources = db.scalars(
        select(GeneratedResource)
        .where(GeneratedResource.subject_id == module_id, GeneratedResource.status != "discarded")
        .order_by(GeneratedResource.created_at.desc())
    ).all()
    resource_ids_for_units = [resource.id for resource in resources]
    resource_unit_links = (
        db.scalars(select(GeneratedResourceUnit).where(GeneratedResourceUnit.generated_resource_id.in_(resource_ids_for_units))).all()
        if resource_ids_for_units
        else []
    )
    units_by_resource: dict[str, list[LearningUnit]] = {}
    for link in resource_unit_links:
        linked_unit = unit_by_id.get(link.learning_unit_id)
        if linked_unit:
            units_by_resource.setdefault(link.generated_resource_id, []).append(linked_unit)
    student_generated_materials = [resource for resource in resources if resource.generated_by == "student-ai-service" and resource.student_id == student_id]

    return {
        "student": student_user,
        "module": subject,
        "enrolled_modules": enrolled_modules,
        "context": context,
        "progress": [
            {
                "id": item.id,
                "module": subject,
                "unit": unit_by_id.get(item.learning_unit_id),
                "progress_percent": item.progress_percent,
                "activities_completed": item.activities_completed,
                "updated_at": item.updated_at,
            }
            for item in progresses
        ],
        "materials": [
            {
                "id": item.id,
                "material_id": item.material_id,
                "material_kind": item.material_kind,
                "title": (materials.get(item.material_id) or generated_by_id.get(item.material_id)).title
                if (materials.get(item.material_id) or generated_by_id.get(item.material_id))
                else item.material_id,
                "module": subject,
                "unit": unit_by_id.get(item.learning_unit_id),
                "started_at": item.started_at,
                "ended_at": item.finished_at,
                "duration_seconds": item.duration_seconds,
                "outside_school_hours": item.outside_school_hours,
            }
            for item in consultations
        ],
        "generated_resources": [
            {
                "id": resource.id,
                "title": resource.title,
                "status": resource.status,
                "learning_path": resource.learning_path,
                "resource_type": resource.resource_type,
                "unit": unit_by_id.get(resource.learning_unit_id),
                "created_at": resource.created_at,
                "published_at": resource.published_at,
            }
            for resource in resources
            if resource_visible_for_student(db, resource, student_id) and resource.generated_by != "student-ai-service"
        ],
        "student_generated_materials": [
            {
                "id": resource.id,
                "title": resource.title,
                "status": resource.status,
                "learning_path": resource.learning_path,
                "resource_type": resource.resource_type,
                "unit": unit_by_id.get(resource.learning_unit_id),
                "units": units_by_resource.get(resource.id, [unit_by_id[resource.learning_unit_id]] if resource.learning_unit_id in unit_by_id else []),
                "summary": resource.summary,
                "generated_content": resource.generated_content,
                "created_at": resource.created_at,
                "published_at": resource.published_at,
            }
            for resource in student_generated_materials
        ],
        "submissions": [
            {
                "id": item.id,
                "student_id": item.student_id,
                "subject_id": item.subject_id,
                "learning_unit_id": item.learning_unit_id,
                "material_id": item.material_id,
                "material_kind": item.material_kind,
                "title": item.title,
                "notes": item.notes,
                "unit": unit_by_id.get(item.learning_unit_id),
                "original_filename": item.original_filename,
                "mime_type": item.mime_type,
                "file_size": item.file_size,
                "status": item.status,
                "submitted_at": item.submitted_at,
                "download_url": f"/api/student-submissions/{item.id}/download" if item.file_path else None,
            }
            for item in submissions
        ],
        "questions": [
            {
                "id": item.id,
                "datetime": item.created_at,
                "module": subject,
                "unit": unit_by_id.get(item.learning_unit_id),
                "question": item.question,
                "detected_topic": item.detected_topic,
                "learning_path": item.learning_path,
                "summary": item.summary,
                "generated_content": item.generated_content,
            }
            for item in questions
        ],
        "path_history": path_history,
        "alerts": [
            {
                "id": item.id,
                "unit": unit_by_id.get(item.learning_unit_id) if item.learning_unit_id else None,
                "alert_type": item.alert_type,
                "reason": item.reason,
                "evidence": item.evidence,
                "status": item.status,
                "created_at": item.created_at,
            }
            for item in alerts
        ],
        "interventions": [
            {
                "id": item.id,
                "unit": unit_by_id.get(item.learning_unit_id) if item.learning_unit_id else None,
                "intervention_type": item.intervention_type,
                "description": item.description,
                "result_or_follow_up": item.result_or_follow_up,
                "status": item.status,
                "created_at": item.created_at,
            }
            for item in interventions
        ],
        "feedback": feedback,
    }


@app.post("/api/materials/{material_id}/consultations/start", response_model=SimpleRecordOut)
def start_consultation(material_id: str, payload: ConsultationCreate, db: Session = Depends(get_db)):
    started = now()
    outside_school_hours = started.weekday() >= 5 or started.hour < 8 or started.hour >= 15
    consultation = MaterialConsultation(
        id=f"consultation-{uuid4()}",
        student_id=payload.student_id,
        subject_id=payload.subject_id,
        learning_unit_id=payload.learning_unit_id,
        material_id=material_id,
        material_kind=payload.material_kind,
        outside_school_hours=outside_school_hours,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return consultation


@app.patch("/api/materials/{material_id}/consultations/{consultation_id}", response_model=SimpleRecordOut)
def patch_consultation(material_id: str, consultation_id: str, db: Session = Depends(get_db)):
    consultation = get_or_404(db, MaterialConsultation, consultation_id, "Consultation not found")
    if consultation.material_id != material_id:
        raise HTTPException(status_code=403, detail="Consultation belongs to another material")
    consultation.duration_seconds += 30
    db.commit()
    db.refresh(consultation)
    return consultation


@app.post("/api/materials/{material_id}/consultations/{consultation_id}/finish", response_model=SimpleRecordOut)
def finish_consultation(material_id: str, consultation_id: str, db: Session = Depends(get_db)):
    consultation = get_or_404(db, MaterialConsultation, consultation_id, "Consultation not found")
    if consultation.material_id != material_id:
        raise HTTPException(status_code=403, detail="Consultation belongs to another material")
    consultation.finished_at = now()
    db.commit()
    db.refresh(consultation)
    return consultation


@app.post("/api/feedback", response_model=SimpleRecordOut)
def create_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)):
    feedback = MaterialFeedback(id=f"feedback-{uuid4()}", **payload.model_dump())
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@app.get("/api/modules/{module_id}/alerts")
def module_alerts(module_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Subject, module_id, "Module not found")
    return db.scalars(select(PedagogicalAlert).where(PedagogicalAlert.subject_id == module_id).order_by(PedagogicalAlert.created_at.desc())).all()


@app.post("/api/modules/{module_id}/alerts/recalculate")
def recalculate_alerts(module_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Subject, module_id, "Module not found")
    return {"status": "ok", "message": "Reglas demo recalculadas sin cambios automáticos de itinerario"}


@app.patch("/api/modules/{module_id}/alerts/{alert_id}")
def patch_alert(module_id: str, alert_id: str, status: str = "reviewed", db: Session = Depends(get_db)):
    alert = get_or_404(db, PedagogicalAlert, alert_id, "Alert not found")
    if alert.subject_id != module_id:
        raise HTTPException(status_code=403, detail="Alert belongs to another module")
    alert.status = status
    db.commit()
    return alert


@app.post("/api/modules/{module_id}/alerts/{alert_id}/interventions")
def create_alert_intervention(module_id: str, alert_id: str, payload: InterventionCreate, db: Session = Depends(get_db)):
    alert = get_or_404(db, PedagogicalAlert, alert_id, "Alert not found")
    if alert.subject_id != module_id:
        raise HTTPException(status_code=403, detail="Alert belongs to another module")
    values = payload.model_dump()
    values["alert_id"] = alert_id
    intervention = TeacherIntervention(id=f"intervention-{uuid4()}", subject_id=module_id, **values)
    db.add(intervention)
    alert.status = "action_registered"
    db.commit()
    return intervention


@app.get("/api/modules/{module_id}/metrics")
def module_metrics(module_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Subject, module_id, "Module not found")
    return {
        "materials_consulted": len(db.scalars(select(MaterialConsultation).where(MaterialConsultation.subject_id == module_id)).all()),
        "questions": len(db.scalars(select(StudentExplanation).where(StudentExplanation.subject_id == module_id)).all()),
        "alerts_open": len(db.scalars(select(PedagogicalAlert).where(PedagogicalAlert.subject_id == module_id, PedagogicalAlert.status == "open")).all()),
        "resources_published": len(
            db.scalars(
                select(GeneratedResource).where(
                    GeneratedResource.subject_id == module_id,
                    GeneratedResource.generated_by == "ai-service",
                    GeneratedResource.status == "published",
                )
            ).all()
        ),
    }


@app.get("/api/modules/{module_id}/indicators", response_model=list[IndicatorOut])
def module_indicators(module_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Subject, module_id, "Module not found")
    return db.scalars(select(ProjectIndicator).where(ProjectIndicator.subject_id == module_id).order_by(ProjectIndicator.code)).all()


@app.patch("/api/modules/{module_id}/indicators/{indicator_id}", response_model=IndicatorOut)
def patch_indicator(module_id: str, indicator_id: str, status: str | None = None, observation: str | None = None, db: Session = Depends(get_db)):
    indicator = get_or_404(db, ProjectIndicator, indicator_id, "Indicator not found")
    if indicator.subject_id != module_id:
        raise HTTPException(status_code=403, detail="Indicator belongs to another module")
    if status is not None:
        indicator.status = status
    if observation is not None:
        indicator.teacher_observation = observation
    indicator.updated_at = now()
    db.commit()
    db.refresh(indicator)
    return indicator


@app.get("/api/students/{student_id}", response_model=UserOut)
def student(student_id: str, db: Session = Depends(get_db)):
    user = get_or_404(db, User, student_id, "Student not found")
    if user.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")
    return user


@app.get("/api/students/{student_id}/context", response_model=StudentContextOut)
def get_context(student_id: str, subject_id: str, db: Session = Depends(get_db)):
    return context_for(db, student_id, subject_id)


@app.put("/api/students/{student_id}/context", response_model=StudentContextOut)
def update_context(student_id: str, subject_id: str, payload: StudentContextUpdate, db: Session = Depends(get_db)):
    get_or_404(db, Subject, subject_id, "Subject not found")
    get_or_404(db, User, student_id, "Student not found")
    context = context_for(db, student_id, subject_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(context, key, value)
    context.updated_at = now()
    db.commit()
    db.refresh(context)
    return context


@app.post("/api/resources/generate", response_model=ResourceOut)
async def generate_resource(payload: ResourceGenerateRequest, db: Session = Depends(get_db)):
    subject = get_or_404(db, Subject, payload.subject_id, "Subject not found")
    unit = get_or_404(db, LearningUnit, payload.learning_unit_id, "Unit not found")
    if unit.subject_id != subject.id:
        raise HTTPException(status_code=400, detail="Unit does not belong to subject")
    get_or_404(db, User, payload.teacher_id, "Teacher not found")
    context = context_for(db, payload.student_id, payload.subject_id)
    ai_response = await call_ai(
        ai_payload(
            subject,
            unit,
            context,
            request_mode="teacher_resource",
            learning_path=payload.learning_path,
            resource_type=payload.resource_type,
            base_content=payload.base_content,
            teacher_instructions=payload.teacher_instructions,
        )
    )
    resource = GeneratedResource(
        id=f"resource-{uuid4()}",
        student_id=payload.student_id,
        teacher_id=payload.teacher_id,
        subject_id=payload.subject_id,
        learning_unit_id=payload.learning_unit_id,
        learning_path=payload.learning_path,
        resource_type=payload.resource_type,
        title=ai_response["title"],
        summary=ai_response["summary"],
        base_content=payload.base_content,
        teacher_instructions=payload.teacher_instructions,
        generated_content=ai_response["generated_content"],
        adaptations=ai_response.get("adaptations", {}),
        generated_by="ai-service",
        status="draft",
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@app.post("/api/adaptive-resources/generate", response_model=ResourceOut)
async def generate_adaptive_resource(payload: AdaptiveGenerateRequest, db: Session = Depends(get_db)):
    subject = get_or_404(db, Subject, payload.module_id, "Module not found")
    units = [module_unit(payload.module_id, unit_id, db) for unit_id in payload.unit_ids]
    materials = [get_base_material(payload.module_id, material_id, db) for material_id in payload.base_material_ids]
    if not materials:
        raise HTTPException(status_code=400, detail="At least one base material is required")
    student_ids = payload.student_ids if payload.audience_type == "student" and payload.student_ids else []
    representative_student_id = student_ids[0] if student_ids else db.scalar(select(Enrollment.student_id).where(Enrollment.subject_id == subject.id))
    if not representative_student_id:
        raise HTTPException(status_code=400, detail="No enrolled student available for generation context")
    context = context_for(db, representative_student_id, subject.id)
    target_contexts = [
        {
            "student_id": student_id,
            "context": context_for(db, student_id, subject.id).__dict__,
        }
        for student_id in student_ids
    ]
    base_content = "\n\n".join(
        [
            f"{material.title}\n{material.description}\n{material.text_content or material.url or material.original_filename or ''}".strip()
            for material in materials
        ]
    )
    ai_response = await call_ai(
        ai_payload(
            subject,
            units[0],
            context,
            request_mode="teacher_resource",
            module={"id": subject.id, "name": subject.name},
            units=[
                {
                    "id": unit.id,
                    "code": unit.code,
                    "title": unit.title,
                    "learning_outcomes": [unit.learning_outcome],
                    "evaluation_criteria": unit.evaluation_criteria,
                    "contents": unit.contents,
                }
                for unit in units
            ],
            base_materials=[
                {
                    "id": material.id,
                    "title": material.title,
                    "type": material.material_type,
                    "description": material.description,
                    "extracted_or_provided_text": material.text_content or material.url or material.original_filename or "",
                }
                for material in materials
            ],
            learning_path=payload.learning_path,
            resource_type=payload.resource_type,
            base_content=base_content,
            teacher_instructions=payload.teacher_instructions,
            audience={
                "type": payload.audience_type,
                "student_ids": student_ids,
                "pathway": payload.learning_path,
                "target_student_contexts": [
                    {
                        "student_id": item["student_id"],
                        "prior_knowledge": item["context"].get("prior_knowledge", ""),
                        "recommended_path": item["context"].get("recommended_path", ""),
                        "current_path": item["context"].get("current_path", ""),
                        "autonomy_level": item["context"].get("autonomy_level", ""),
                        "support_needs": item["context"].get("support_needs", ""),
                        "content_preferences": item["context"].get("content_preferences", ""),
                        "detected_difficulties": item["context"].get("detected_difficulties", ""),
                        "teacher_notes": item["context"].get("teacher_notes", ""),
                    }
                    for item in target_contexts
                ],
            },
        )
    )
    resource = GeneratedResource(
        id=f"resource-{uuid4()}",
        student_id=representative_student_id,
        teacher_id=payload.teacher_id,
        subject_id=subject.id,
        learning_unit_id=units[0].id,
        learning_path=payload.learning_path,
        resource_type=payload.resource_type,
        version=1,
        title=payload.title or ai_response["title"],
        summary=ai_response["summary"],
        base_content=base_content,
        teacher_instructions=payload.teacher_instructions,
        generated_content=ai_response["generated_content"],
        adaptations=ai_response.get("adaptations", {}),
        generated_by="ai-service",
        status="generated",
    )
    db.add(resource)
    db.flush()
    for material in materials:
        db.add(GeneratedResourceSource(id=f"resource-source-{uuid4()}", generated_resource_id=resource.id, base_material_id=material.id))
    for unit in units:
        db.add(GeneratedResourceUnit(id=f"resource-unit-{uuid4()}", generated_resource_id=resource.id, learning_unit_id=unit.id))
    if payload.audience_type == "student":
        for student_id in student_ids:
            ensure_enrolled(db, student_id, subject.id)
            db.add(
                GeneratedResourceAudience(
                    id=f"resource-audience-{uuid4()}",
                    generated_resource_id=resource.id,
                    audience_type="student",
                    student_id=student_id,
                )
            )
    else:
        db.add(
            GeneratedResourceAudience(
                id=f"resource-audience-{uuid4()}",
                generated_resource_id=resource.id,
                audience_type="pathway",
                pathway=payload.learning_path,
            )
        )
    db.commit()
    db.refresh(resource)
    return resource


@app.get("/api/resources/{resource_id}", response_model=ResourceOut)
def get_resource(resource_id: str, db: Session = Depends(get_db)):
    return get_or_404(db, GeneratedResource, resource_id, "Resource not found")


@app.get("/api/adaptive-resources/{resource_id}", response_model=ResourceOut)
def get_adaptive_resource(resource_id: str, db: Session = Depends(get_db)):
    return get_resource(resource_id, db)


@app.get("/api/modules/{module_id}/generated-resources", response_model=list[ResourceOut])
def module_generated_resources(module_id: str, unit_ids: list[str] | None = Query(None), db: Session = Depends(get_db)):
    get_or_404(db, Subject, module_id, "Module not found")
    query = select(GeneratedResource).where(
        GeneratedResource.subject_id == module_id,
        GeneratedResource.generated_by == "ai-service",
        GeneratedResource.status != "discarded",
    )
    if unit_ids:
        resource_ids = (
            select(GeneratedResourceUnit.generated_resource_id)
            .where(GeneratedResourceUnit.learning_unit_id.in_(unit_ids))
        )
        query = query.where(GeneratedResource.id.in_(resource_ids))
    return db.scalars(query.order_by(GeneratedResource.created_at.desc())).all()


@app.patch("/api/adaptive-resources/{resource_id}", response_model=ResourceOut)
def patch_adaptive_resource(resource_id: str, payload: ResourcePatch, db: Session = Depends(get_db)):
    return patch_resource(resource_id, payload, db)


@app.post("/api/adaptive-resources/{resource_id}/review", response_model=ResourceOut)
def review_adaptive_resource(resource_id: str, db: Session = Depends(get_db)):
    resource = get_or_404(db, GeneratedResource, resource_id, "Resource not found")
    if resource.status not in {"draft", "generated"}:
        raise HTTPException(status_code=409, detail="Only draft or generated resources can be reviewed")
    resource.status = "reviewed"
    resource.reviewed_at = now()
    db.commit()
    db.refresh(resource)
    return resource


@app.post("/api/adaptive-resources/{resource_id}/validate", response_model=ResourceOut)
def validate_adaptive_resource(resource_id: str, payload: ResourceValidationCreate, db: Session = Depends(get_db)):
    resource = get_or_404(db, GeneratedResource, resource_id, "Resource not found")
    if resource.status not in {"draft", "generated", "reviewed"}:
        raise HTTPException(status_code=409, detail="Resource cannot be validated from this status")
    validation = ResourceValidation(id=f"validation-{uuid4()}", generated_resource_id=resource.id, **payload.model_dump())
    db.add(validation)
    if payload.decision == "validated":
        resource.status = "validated"
        resource.validated_at = now()
    else:
        resource.status = "reviewed"
    db.commit()
    db.refresh(resource)
    return resource


@app.get("/api/adaptive-resources/{resource_id}/validation", response_model=list[ResourceValidationOut])
def adaptive_resource_validations(resource_id: str, db: Session = Depends(get_db)):
    get_or_404(db, GeneratedResource, resource_id, "Resource not found")
    return db.scalars(select(ResourceValidation).where(ResourceValidation.generated_resource_id == resource_id)).all()


@app.post("/api/adaptive-resources/{resource_id}/publish", response_model=ResourceOut)
def publish_adaptive_resource(resource_id: str, unit_ids: list[str] | None = None, db: Session = Depends(get_db)):
    resource = get_or_404(db, GeneratedResource, resource_id, "Resource not found")
    if resource.status != "validated":
        raise HTTPException(status_code=409, detail="Only validated resources can be published")
    links = db.scalars(select(GeneratedResourceUnit).where(GeneratedResourceUnit.generated_resource_id == resource.id)).all()
    for link in links:
        if unit_ids is None or link.learning_unit_id in unit_ids:
            link.is_published = True
            link.published_at = now()
    resource.status = "published"
    resource.published_at = now()
    db.commit()
    db.refresh(resource)
    return resource


@app.post("/api/adaptive-resources/{resource_id}/unpublish", response_model=ResourceOut)
def unpublish_adaptive_resource(resource_id: str, db: Session = Depends(get_db)):
    resource = get_or_404(db, GeneratedResource, resource_id, "Resource not found")
    links = db.scalars(select(GeneratedResourceUnit).where(GeneratedResourceUnit.generated_resource_id == resource.id)).all()
    for link in links:
        link.is_published = False
        link.published_at = None
    resource.status = "validated"
    resource.published_at = None
    db.commit()
    db.refresh(resource)
    return resource


@app.post("/api/adaptive-resources/{resource_id}/discard", response_model=ResourceOut)
def discard_adaptive_resource(resource_id: str, db: Session = Depends(get_db)):
    return discard_resource(resource_id, db)


@app.post("/api/adaptive-resources/{resource_id}/archive", response_model=ResourceOut)
def archive_adaptive_resource(resource_id: str, db: Session = Depends(get_db)):
    resource = get_or_404(db, GeneratedResource, resource_id, "Resource not found")
    resource.status = "archived"
    db.commit()
    db.refresh(resource)
    return resource


@app.patch("/api/resources/{resource_id}", response_model=ResourceOut)
def patch_resource(resource_id: str, payload: ResourcePatch, db: Session = Depends(get_db)):
    resource = get_or_404(db, GeneratedResource, resource_id, "Resource not found")
    if resource.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft resources can be edited")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(resource, key, value)
    resource.updated_at = now()
    db.commit()
    db.refresh(resource)
    return resource


@app.post("/api/resources/{resource_id}/validate", response_model=ResourceOut)
def validate_resource(resource_id: str, db: Session = Depends(get_db)):
    resource = get_or_404(db, GeneratedResource, resource_id, "Resource not found")
    if resource.status != "draft":
        raise HTTPException(status_code=409, detail="Only draft resources can be validated")
    resource.status = "validated"
    resource.validated_at = now()
    db.commit()
    db.refresh(resource)
    return resource


@app.post("/api/resources/{resource_id}/publish", response_model=ResourceOut)
def publish_resource(resource_id: str, db: Session = Depends(get_db)):
    resource = get_or_404(db, GeneratedResource, resource_id, "Resource not found")
    if resource.status != "validated":
        raise HTTPException(status_code=409, detail="Only validated resources can be published")
    resource.status = "published"
    resource.published_at = now()
    db.commit()
    db.refresh(resource)
    return resource


@app.post("/api/resources/{resource_id}/discard", response_model=ResourceOut)
def discard_resource(resource_id: str, db: Session = Depends(get_db)):
    resource = get_or_404(db, GeneratedResource, resource_id, "Resource not found")
    resource.status = "discarded"
    db.commit()
    db.refresh(resource)
    return resource


@app.get("/api/students/{student_id}/resources", response_model=list[ResourceOut])
def student_resources(student_id: str, status: str | None = None, db: Session = Depends(get_db)):
    get_or_404(db, User, student_id, "Student not found")
    enrolled_subject_ids = db.scalars(select(Enrollment.subject_id).where(Enrollment.student_id == student_id)).all()
    query = select(GeneratedResource).where(
        GeneratedResource.subject_id.in_(enrolled_subject_ids),
        GeneratedResource.status != "discarded",
    )
    if status:
        query = query.where(GeneratedResource.status == status)
    resources = db.scalars(query.order_by(GeneratedResource.created_at.desc())).all()
    return [resource for resource in resources if resource_visible_for_student(db, resource, student_id)]


@app.get("/api/student/modules", response_model=list[SubjectOut])
def student_modules(student_id: str = Query("student-laura-garcia-morales"), db: Session = Depends(get_db)):
    return db.scalars(
        select(Subject)
        .join(Enrollment, Enrollment.subject_id == Subject.id)
        .where(Enrollment.student_id == student_id)
        .order_by(Subject.name)
    ).all()


@app.get("/api/student/modules/{module_id}/units", response_model=list[UnitOut])
def student_module_units(module_id: str, student_id: str = Query("student-laura-garcia-morales"), db: Session = Depends(get_db)):
    ensure_enrolled(db, student_id, module_id)
    return db.scalars(
        select(LearningUnit)
        .where(LearningUnit.subject_id == module_id, LearningUnit.status == "published")
        .order_by(LearningUnit.unit_order)
    ).all()


@app.get("/api/student/modules/{module_id}/units/{unit_id}", response_model=UnitOut)
def student_module_unit(module_id: str, unit_id: str, student_id: str = Query("student-laura-garcia-morales"), db: Session = Depends(get_db)):
    ensure_enrolled(db, student_id, module_id)
    unit = module_unit(module_id, unit_id, db)
    if unit.status != "published":
        raise HTTPException(status_code=404, detail="Unit not available")
    return unit


@app.get("/api/student/modules/{module_id}/units/{unit_id}/materials")
def student_unit_materials(module_id: str, unit_id: str, student_id: str = Query("student-laura-garcia-morales"), db: Session = Depends(get_db)):
    unit = student_module_unit(module_id, unit_id, student_id, db)
    base = db.scalars(
        select(BaseMaterial)
        .join(LearningUnitBaseMaterial, LearningUnitBaseMaterial.base_material_id == BaseMaterial.id)
        .where(LearningUnitBaseMaterial.learning_unit_id == unit.id, BaseMaterial.status == "published")
        .order_by(LearningUnitBaseMaterial.display_order)
    ).all()
    resource_links = db.scalars(
        select(GeneratedResource)
        .join(GeneratedResourceUnit, GeneratedResourceUnit.generated_resource_id == GeneratedResource.id)
        .where(GeneratedResourceUnit.learning_unit_id == unit.id, GeneratedResourceUnit.is_published == True)  # noqa: E712
    ).all()
    adaptive = [resource for resource in resource_links if resource_visible_for_student(db, resource, student_id)]
    return {
        "standard_materials": base,
        "adaptive_resources": adaptive,
        "current_path": current_path_for(db, student_id, module_id),
    }


@app.get("/api/students/{student_id}/material-completions", response_model=list[StudentMaterialCompletionOut])
def student_material_completions(
    student_id: str,
    subject_id: str | None = None,
    db: Session = Depends(get_db),
):
    get_or_404(db, User, student_id, "Student not found")
    query = select(StudentMaterialCompletion).where(StudentMaterialCompletion.student_id == student_id)
    if subject_id:
        ensure_enrolled(db, student_id, subject_id)
        query = query.where(StudentMaterialCompletion.subject_id == subject_id)
    return db.scalars(query.order_by(StudentMaterialCompletion.updated_at.desc())).all()


@app.put(
    "/api/student/modules/{module_id}/units/{unit_id}/materials/{material_id}/completion",
    response_model=StudentMaterialCompletionOut,
)
def set_student_material_completion(
    module_id: str,
    unit_id: str,
    material_id: str,
    payload: StudentMaterialCompletionUpdate,
    student_id: str = Query("student-laura-garcia-morales"),
    db: Session = Depends(get_db),
):
    material_kind, material = material_for_student_unit(db, module_id, unit_id, material_id, student_id)
    if payload.material_kind != material_kind:
        raise HTTPException(status_code=400, detail="Material type does not match")
    if material_kind == "adaptive" and getattr(material, "generated_by", "") == "student-ai-service":
        raise HTTPException(status_code=400, detail="Study material does not count for progress")

    completion = db.scalar(
        select(StudentMaterialCompletion).where(
            StudentMaterialCompletion.student_id == student_id,
            StudentMaterialCompletion.material_id == material_id,
            StudentMaterialCompletion.material_kind == material_kind,
        )
    )
    if completion is None:
        completion = StudentMaterialCompletion(
            id=f"completion-{uuid4()}",
            student_id=student_id,
            subject_id=module_id,
            learning_unit_id=unit_id,
            material_id=material_id,
            material_kind=material_kind,
        )
        db.add(completion)
    completion.subject_id = module_id
    completion.learning_unit_id = unit_id
    completion.completed = payload.completed
    completion.completed_at = now() if payload.completed else None
    completion.updated_at = now()
    db.flush()
    recalculate_student_unit_progress(db, student_id, module_id, unit_id)
    db.commit()
    db.refresh(completion)
    return completion


@app.post(
    "/api/student/modules/{module_id}/units/{unit_id}/materials/{material_id}/submissions",
    response_model=StudentMaterialSubmissionOut,
)
async def upload_student_material_submission(
    module_id: str,
    unit_id: str,
    material_id: str,
    student_id: str = Query("student-laura-garcia-morales"),
    notes: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    material_kind, material = material_for_student_unit(db, module_id, unit_id, material_id, student_id)
    if material_kind == "adaptive" and getattr(material, "generated_by", "") == "student-ai-service":
        raise HTTPException(status_code=400, detail="Study material does not accept submissions")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File extension not allowed")
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="MIME type not allowed")

    submission = StudentMaterialSubmission(
        id=f"submission-{uuid4()}",
        student_id=student_id,
        subject_id=module_id,
        learning_unit_id=unit_id,
        material_id=material_id,
        material_kind=material_kind,
        title=getattr(material, "title", material_id),
        notes=notes,
        original_filename=file.filename,
        mime_type=file.content_type,
        file_size=len(content),
        submitted_at=now(),
    )
    target_dir = UPLOAD_DIR / "student_submissions" / student_id
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / f"{submission.id}{suffix}"
    target_path.write_bytes(content)
    submission.file_path = str(target_path.relative_to(UPLOAD_DIR))
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@app.get("/api/student-submissions/{submission_id}/download")
def download_student_material_submission(submission_id: str, db: Session = Depends(get_db)):
    submission = get_or_404(db, StudentMaterialSubmission, submission_id, "Submission not found")
    if not submission.file_path:
        raise HTTPException(status_code=404, detail="File not found")
    path = (UPLOAD_DIR / submission.file_path).resolve()
    if not str(path).startswith(str(UPLOAD_DIR.resolve())) or not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type=submission.mime_type, filename=submission.original_filename)


@app.get("/api/student/modules/{module_id}/units/{unit_id}/explanations", response_model=list[ExplanationOut])
def student_unit_explanations(module_id: str, unit_id: str, student_id: str = Query("student-laura-garcia-morales"), db: Session = Depends(get_db)):
    student_module_unit(module_id, unit_id, student_id, db)
    return explanation_history(student_id, unit_id, db)


@app.post("/api/student/modules/{module_id}/units/{unit_id}/explanations", response_model=ExplanationOut)
async def create_student_unit_explanation(module_id: str, unit_id: str, payload: ExplanationCreate, student_id: str = Query("student-laura-garcia-morales"), db: Session = Depends(get_db)):
    student_module_unit(module_id, unit_id, student_id, db)
    return await create_explanation(student_id, unit_id, payload, db)


@app.post("/api/student/modules/{module_id}/assistant", response_model=ExplanationOut)
async def create_student_module_assistant_response(
    module_id: str,
    payload: StudentAssistantRequest,
    student_id: str = Query("student-laura-garcia-morales"),
    db: Session = Depends(get_db),
):
    ensure_enrolled(db, student_id, module_id)
    units = [module_unit(module_id, unit_id, db) for unit_id in payload.unit_ids]
    return await create_contextual_explanation(student_id, module_id, units, payload, db)


@app.post("/api/student/modules/{module_id}/generated-materials", response_model=ResourceOut)
async def create_student_generated_material(
    module_id: str,
    payload: StudentGeneratedMaterialRequest,
    student_id: str = Query("student-laura-garcia-morales"),
    db: Session = Depends(get_db),
):
    student_user = get_or_404(db, User, student_id, "Student not found")
    if student_user.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")
    ensure_enrolled(db, student_id, module_id)
    subject = get_or_404(db, Subject, module_id, "Subject not found")
    units = [module_unit(module_id, unit_id, db) for unit_id in payload.unit_ids]
    if not units:
        raise HTTPException(status_code=400, detail="At least one unit is required")
    context = context_for(db, student_id, subject.id)
    visible_materials = visible_materials_for_student_context(db, units, student_id)
    source_material_ids = set(payload.source_material_ids)
    source_materials = [material for material in visible_materials if material["id"] in source_material_ids]
    if source_material_ids and len(source_materials) != len(source_material_ids):
        raise HTTPException(status_code=400, detail="Source material not available")
    ai_response = await call_ai(
        ai_payload(
            subject,
            units[0],
            context,
            request_mode="student_resource",
            question=payload.prompt,
            teacher_instructions=payload.prompt,
            learning_path=context.current_path or context.recommended_path,
            resource_type=payload.resource_type,
            module={"id": subject.id, "name": subject.name, "course": subject.course, "academic_year": subject.academic_year},
            units=[
                {
                    "id": unit.id,
                    "code": unit.code,
                    "title": unit.title,
                    "learning_outcomes": [unit.learning_outcome],
                    "evaluation_criteria": unit.evaluation_criteria,
                    "contents": unit.contents,
                }
                for unit in units
            ],
            visible_materials=visible_materials,
            source_materials=source_materials,
            audience={"type": "student", "student_ids": [student_id], "generated_by_student": True},
        )
    )
    resource = GeneratedResource(
        id=f"resource-{uuid4()}",
        student_id=student_id,
        teacher_id=teacher_id_for_module(db, subject.id),
        subject_id=subject.id,
        learning_unit_id=units[0].id,
        learning_path=context.current_path or context.recommended_path,
        resource_type=payload.resource_type,
        version=1,
        title=payload.title or ai_response["title"],
        summary=ai_response["summary"],
        base_content="\n\n".join(f"{unit.code}. {unit.title}\n{unit.learning_outcome}" for unit in units),
        teacher_instructions=payload.prompt,
        generated_content=ai_response["generated_content"],
        adaptations={
            **ai_response.get("adaptations", {}),
            "generated_for": "student",
            "selected_unit_ids": [unit.id for unit in units],
            "source_material_ids": [material["id"] for material in source_materials],
        },
        generated_by="student-ai-service",
        status="published",
        published_at=now(),
    )
    db.add(resource)
    db.flush()
    for unit in units:
        db.add(
            GeneratedResourceUnit(
                id=f"resource-unit-{uuid4()}",
                generated_resource_id=resource.id,
                learning_unit_id=unit.id,
                is_published=True,
                published_at=resource.published_at,
            )
        )
    db.add(
        GeneratedResourceAudience(
            id=f"resource-audience-{uuid4()}",
            generated_resource_id=resource.id,
            audience_type="student",
            student_id=student_id,
        )
    )
    db.commit()
    db.refresh(resource)
    return resource


@app.post("/api/students/{student_id}/units/{unit_id}/explanations", response_model=ExplanationOut)
async def create_explanation(student_id: str, unit_id: str, payload: ExplanationCreate, db: Session = Depends(get_db)):
    unit = get_or_404(db, LearningUnit, unit_id, "Unit not found")
    return await create_contextual_explanation(student_id, unit.subject_id, [unit], payload, db)


async def create_contextual_explanation(
    student_id: str,
    module_id: str,
    selected_units: list[LearningUnit],
    payload: ExplanationCreate,
    db: Session,
) -> ExplanationOut:
    student = get_or_404(db, User, student_id, "Student not found")
    if student.role != "student":
        raise HTTPException(status_code=404, detail="Student not found")
    if not selected_units:
        raise HTTPException(status_code=400, detail="At least one unit is required")
    subject = get_or_404(db, Subject, module_id, "Subject not found")
    for unit in selected_units:
        ensure_unit_in_module(unit, subject.id)
    unit = selected_units[0]
    context = context_for(db, student_id, subject.id)
    ai_response = await call_ai(
        ai_payload(
            subject,
            unit,
            context,
            request_mode="student_explanation",
            question=payload.question,
            topic=payload.topic,
            learning_path=context.current_path or context.recommended_path,
            module={"id": subject.id, "name": subject.name, "course": subject.course, "academic_year": subject.academic_year},
            units=[
                {
                    "id": selected_unit.id,
                    "code": selected_unit.code,
                    "title": selected_unit.title,
                    "learning_outcomes": [selected_unit.learning_outcome],
                    "evaluation_criteria": selected_unit.evaluation_criteria,
                    "contents": selected_unit.contents,
                }
                for selected_unit in selected_units
            ],
            visible_materials=visible_materials_for_student_context(db, selected_units, student_id),
        )
    )
    explanation = StudentExplanation(
        id=f"explanation-{uuid4()}",
        student_id=student_id,
        subject_id=subject.id,
        learning_unit_id=unit.id,
        question=payload.question,
        detected_topic=ai_response.get("detected_topic") or "ut2_general",
        learning_path=context.current_path or context.recommended_path,
        title=ai_response["title"],
        summary=ai_response["summary"],
        generated_content=ai_response["generated_content"],
        key_points=ai_response.get("key_points", []),
        worked_example=ai_response.get("worked_example") or "",
        comprehension_question=ai_response.get("comprehension_question") or "",
        adaptations=ai_response.get("adaptations", {}),
        generated_by="ai-service",
    )
    db.add(explanation)
    db.commit()
    db.refresh(explanation)
    return explanation


@app.get("/api/students/{student_id}/units/{unit_id}/explanations", response_model=list[ExplanationOut])
def explanation_history(student_id: str, unit_id: str, db: Session = Depends(get_db)):
    get_or_404(db, User, student_id, "Student not found")
    unit = get_or_404(db, LearningUnit, unit_id, "Unit not found")
    ensure_enrolled(db, student_id, unit.subject_id)
    return db.scalars(
        select(StudentExplanation)
        .where(StudentExplanation.student_id == student_id, StudentExplanation.learning_unit_id == unit_id)
        .order_by(StudentExplanation.created_at.desc())
    ).all()


@app.get("/api/students/{student_id}/explanations/{explanation_id}", response_model=ExplanationOut)
def get_explanation(student_id: str, explanation_id: str, db: Session = Depends(get_db)):
    explanation = get_or_404(db, StudentExplanation, explanation_id, "Explanation not found")
    if explanation.student_id != student_id:
        raise HTTPException(status_code=403, detail="Explanation belongs to another student")
    return explanation
