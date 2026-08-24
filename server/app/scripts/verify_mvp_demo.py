from __future__ import annotations

import os
import re
from pathlib import Path

from sqlalchemy import select, func

from app.database import SessionLocal
from app.models import (
    BaseMaterial,
    CurriculumEvaluationCriterion,
    CurriculumLearningOutcome,
    CurriculumUnitTemplate,
    DemoSeedMetadata,
    Enrollment,
    GeneratedResource,
    LearningUnit,
    MaterialConsultation,
    MaterialFeedback,
    StudentContext,
    StudentExplanation,
    Subject,
    User,
)
from app.mvp_demo_data import DOMAIN, SEED_VERSION, STUDENTS, TEACHER_EMAIL, TEACHER_ID, normalize_email_local

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
EXPECTED_MODULE_CODES = ["0377", "0379", "AN4699"]


def count(db, model) -> int:
    return int(db.scalar(select(func.count()).select_from(model)) or 0)


def assert_ready(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"MVP demo data: NOT READY\n- {message}")


def module_code(subject: Subject) -> str:
    return subject.name.split("·", 1)[0].strip()


def visible_upload_files() -> list[Path]:
    if not UPLOAD_DIR.exists():
        return []
    return [
        path
        for path in UPLOAD_DIR.rglob("*")
        if path.is_file() and "backups" not in path.relative_to(UPLOAD_DIR).parts
    ]


def main() -> None:
    db = SessionLocal()
    try:
        seed_version = db.get(DemoSeedMetadata, "version")
        assert_ready(seed_version is not None and seed_version.value == SEED_VERSION, "Seed version mismatch.")

        teachers = db.scalars(select(User).where(User.role == "teacher")).all()
        students = db.scalars(select(User).where(User.role == "student")).all()
        subjects = db.scalars(select(Subject).order_by(Subject.name)).all()
        codes = sorted(module_code(subject) for subject in subjects)
        contexts = db.scalars(select(StudentContext)).all()

        assert_ready(len(teachers) == 1, "Expected exactly one teacher.")
        assert_ready(teachers[0].id == TEACHER_ID, "Unexpected teacher id.")
        assert_ready(teachers[0].name == "Álvaro Manuel Aparicio Morales", "Unexpected teacher name.")
        assert_ready(teachers[0].email == TEACHER_EMAIL, "Unexpected teacher email.")
        assert_ready(len(subjects) == 3, "Expected exactly three modules.")
        assert_ready(codes == EXPECTED_MODULE_CODES, f"Unexpected module codes: {codes}.")
        assert_ready("0369" not in codes, "Module 0369 must not exist.")
        assert_ready(len(students) == 22, "Expected twenty-two students.")
        assert_ready(count(db, Enrollment) == 66, "Expected sixty-six enrollments.")
        assert_ready(count(db, StudentContext) == 66, "Expected sixty-six student contexts/path assignments.")

        emails = [student.email for student in students]
        assert_ready(len(set(emails)) == len(emails), "Student emails must be unique.")
        for student in students:
            expected = f"{normalize_email_local(student.name)}{DOMAIN}"
            assert_ready(student.email == expected, f"Email convention mismatch for {student.name}: {student.email}")
            assert_ready(student.email.endswith(DOMAIN), f"Unexpected email domain for {student.name}.")
            assert_ready(re.fullmatch(r"[a-z0-9]+@ritm-ia\.edu\.and", student.email) is not None, f"Invalid email format: {student.email}")

        path_counts = {"standard": 0, "reinforcement": 0, "extension": 0}
        primary_contexts = [context for context in contexts if context.subject_id == "module-0377-asgbd"]
        for context in primary_contexts:
            path_counts[context.current_path] += 1
        assert_ready(path_counts == {"standard": 14, "reinforcement": 5, "extension": 3}, f"Unexpected pathway distribution: {path_counts}")

        assert_ready(count(db, CurriculumLearningOutcome) == 14, "Expected fourteen curriculum learning outcomes.")
        assert_ready(count(db, CurriculumEvaluationCriterion) == 106, "Expected one hundred and six curriculum criteria.")
        assert_ready(count(db, CurriculumUnitTemplate) == 14, "Expected fourteen curriculum UT templates.")
        assert_ready(count(db, LearningUnit) == 0, "Expected zero real learning units.")
        assert_ready(count(db, BaseMaterial) == 0, "Expected zero base materials.")
        assert_ready(count(db, GeneratedResource) == 0, "Expected zero generated resources.")
        assert_ready(count(db, StudentExplanation) == 0, "Expected zero AI questions.")
        assert_ready(count(db, MaterialConsultation) == 0, "Expected zero material consultations.")
        assert_ready(count(db, MaterialFeedback) == 0, "Expected zero material feedback records.")
        assert_ready(len(visible_upload_files()) == 0, "Expected no uploaded test files outside backups.")

        ollama_base = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "gemma3:4b")
        assert_ready(ollama_base == "http://host.docker.internal:11434", "OLLAMA_BASE_URL changed unexpectedly.")
        assert_ready(ollama_model == "gemma3:4b", "OLLAMA_MODEL changed unexpectedly.")

        print("MVP demo data: READY")
        print(f"Seed version: {SEED_VERSION}")
        print("Teacher: 1")
        print(f"Teacher email: {TEACHER_EMAIL}")
        print("Centre: IES Juan de la Cierva · Vélez-Málaga")
        print("Modules: 3")
        print("Module codes: AN4699, 0377, 0379")
        print("Students: 22")
        print("Enrollments: 66")
        print("Standard: 14")
        print("Reinforcement: 5")
        print("Extension: 3")
        print("Curriculum learning outcomes: 14")
        print("Curriculum evaluation criteria: 106")
        print("Curriculum UT templates: 14")
        print("Learning units created: 0")
        print("Base materials: 0")
        print("Generated resources: 0")
        print("AI questions: 0")
        print("Consultations: 0")
        print("Ollama integration: preserved")
    finally:
        db.close()


if __name__ == "__main__":
    main()
