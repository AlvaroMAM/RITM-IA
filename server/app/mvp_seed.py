from sqlalchemy.orm import Session

from .models import (
    CurriculumEvaluationCriterion,
    CurriculumLearningOutcome,
    CurriculumUnitTemplate,
    DemoSeedMetadata,
    Enrollment,
    StudentContext,
    Subject,
    TeacherSubject,
    User,
)
from .mvp_demo_data import CENTER_CONTEXT, CURRICULUM, MODULES, SEED_VERSION, STUDENTS, TEACHER_EMAIL, TEACHER_ID, student_email, template_contents, criterion_text


def upsert(db: Session, model, id: str, **values):
    obj = db.get(model, id)
    if obj is None:
        if model is DemoSeedMetadata:
            obj = model(key=id, **values)
        else:
            obj = model(id=id, **values)
        db.add(obj)
    else:
        for key, value in values.items():
            setattr(obj, key, value)
    return obj


def seed_mvp_recording(db: Session) -> None:
    upsert(
        db,
        User,
        TEACHER_ID,
        name="Álvaro Manuel Aparicio Morales",
        email=TEACHER_EMAIL,
        role="teacher",
    )

    for student_id, name, _, _, _ in STUDENTS:
        upsert(db, User, student_id, name=name, email=student_email(name), role="student")

    db.flush()

    for module in MODULES:
        description = (
            f"{module['code']} · {module['name']}. {CENTER_CONTEXT['centre_display']}. "
            f"{CENTER_CONTEXT['cycle']} · {CENTER_CONTEXT['group']} · {CENTER_CONTEXT['academic_year']}. "
            f"Duración: {module['hours']} horas. Documento: {module['source_document']}."
        )
        upsert(
            db,
            Subject,
            module["id"],
            name=f"{module['code']} · {module['name']}",
            course=CENTER_CONTEXT["group"],
            academic_year=CENTER_CONTEXT["academic_year"],
            description=description,
        )
        db.flush()
        upsert(
            db,
            TeacherSubject,
            f"teacher-subject-{module['code'].lower()}",
            subject_id=module["id"],
            teacher_id=TEACHER_ID,
        )

        for student_id, _, path, autonomy, notes in STUDENTS:
            upsert(
                db,
                Enrollment,
                f"enrollment-{module['id']}-{student_id}",
                subject_id=module["id"],
                student_id=student_id,
            )
            upsert(
                db,
                StudentContext,
                f"context-{module['id']}-{student_id}",
                student_id=student_id,
                subject_id=module["id"],
                prior_knowledge="Contexto sintético procedente de la evaluación inicial de demostración.",
                recommended_path=path,
                current_path=path,
                autonomy_level=autonomy,
                weekly_availability="Disponibilidad ordinaria para trabajo presencial y revisión breve fuera del aula.",
                support_needs="Apoyos ajustados al itinerario de aprendizaje asignado inicialmente.",
                content_preferences="Prefiere materiales claros, ejemplos vinculados al módulo y actividades aplicadas.",
                detected_difficulties="Sin datos de actividad todavía. Se completará durante la grabación.",
                teacher_notes=notes,
            )

    db.flush()

    for module in MODULES:
        module_id = module["id"]
        curriculum = CURRICULUM[module_id]
        for outcome_index, (code, description, criteria_count) in enumerate(curriculum["outcomes"], start=1):
            outcome_id = f"ra-{module['code'].lower()}-{code.lower()}"
            upsert(
                db,
                CurriculumLearningOutcome,
                outcome_id,
                subject_id=module_id,
                code=code,
                description=description,
                display_order=outcome_index,
            )
            db.flush()
            for criterion_index in range(criteria_count):
                criterion_code = f"{code[-1]}.{chr(97 + criterion_index)}"
                upsert(
                    db,
                    CurriculumEvaluationCriterion,
                    f"ce-{module['code'].lower()}-{criterion_code.replace('.', '-')}",
                    subject_id=module_id,
                    learning_outcome_id=outcome_id,
                    code=criterion_code,
                    description=criterion_text(code, criterion_index, module_id),
                    display_order=criterion_index + 1,
                )

        for template_index, (code, title, primary_ra, hours) in enumerate(curriculum["templates"], start=1):
            upsert(
                db,
                CurriculumUnitTemplate,
                f"template-{module['code'].lower()}-{code.lower()}",
                subject_id=module_id,
                code=code,
                title=title,
                description=f"Propuesta curricular para {title.lower()}. No es una unidad de trabajo real.",
                primary_learning_outcome_code=primary_ra,
                suggested_contents=template_contents(title),
                estimated_hours=hours,
                display_order=template_index,
            )

    upsert(db, DemoSeedMetadata, "version", value=SEED_VERSION)
    upsert(db, DemoSeedMetadata, "environment", value="mvp-recording")
    upsert(db, DemoSeedMetadata, "notice", value="Entorno de demostración. Los datos del alumnado y sus interacciones son ficticios.")
    db.commit()
