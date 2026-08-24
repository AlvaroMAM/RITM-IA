from __future__ import annotations

import argparse
import json
import os
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select

from app.database import SessionLocal, engine
from app.models import (
    Base,
    BaseMaterial,
    CurriculumEvaluationCriterion,
    CurriculumLearningOutcome,
    CurriculumUnitTemplate,
    DemoSeedMetadata,
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
    StudentPathHistory,
    StudentProgress,
    Subject,
    TeacherIntervention,
    TeacherSubject,
    User,
)
from app.mvp_demo_data import SEED_VERSION
from app.mvp_seed import seed_mvp_recording

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
BACKUP_ROOT = Path(os.getenv("DEMO_BACKUP_DIR", str(UPLOAD_DIR / "backups" / "pre-mvp-recording")))

DELETE_ORDER = [
    ResourceValidation,
    GeneratedResourceAudience,
    GeneratedResourceUnit,
    GeneratedResourceSource,
    MaterialFeedback,
    MaterialConsultation,
    StudentExplanation,
    StudentProgress,
    TeacherIntervention,
    PedagogicalAlert,
    StudentPathHistory,
    LearningUnitBaseMaterial,
    BaseMaterial,
    GeneratedResource,
    LearningUnit,
    CurriculumEvaluationCriterion,
    CurriculumLearningOutcome,
    CurriculumUnitTemplate,
    ProjectIndicator,
    StudentContext,
    Enrollment,
    TeacherSubject,
    DemoSeedMetadata,
    Subject,
    User,
]


def sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    if hasattr(value, "isoformat"):
        value = value.isoformat()
    return "'" + str(value).replace("'", "''") + "'"


def uploads_manifest() -> list[dict[str, Any]]:
    if not UPLOAD_DIR.exists():
        return []
    backup_root = BACKUP_ROOT.resolve()
    items: list[dict[str, Any]] = []
    for path in UPLOAD_DIR.rglob("*"):
        if not path.is_file():
            continue
        resolved = path.resolve()
        if str(resolved).startswith(str(backup_root)):
            continue
        items.append({"path": str(path.relative_to(UPLOAD_DIR)), "size": path.stat().st_size})
    return items


def create_backup() -> Path:
    timestamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    target = BACKUP_ROOT / timestamp
    target.mkdir(parents=True, exist_ok=True)

    manifest = uploads_manifest()
    (target / "uploads-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (target / "metadata.json").write_text(
        json.dumps(
            {
                "created_at": datetime.now(UTC).isoformat(),
                "seed_version": SEED_VERSION,
                "app_env": os.getenv("APP_ENV", "development"),
                "upload_dir": str(UPLOAD_DIR),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    with engine.connect() as connection:
        lines = [
            "-- RITM-IA pre MVP recording backup",
            f"-- created_at: {datetime.now(UTC).isoformat()}",
            f"-- seed_version: {SEED_VERSION}",
            "",
        ]
        for table in Base.metadata.sorted_tables:
            rows = connection.execute(select(table)).mappings().all()
            if not rows:
                continue
            columns = [column.name for column in table.columns]
            quoted_columns = ", ".join(columns)
            for row in rows:
                values = ", ".join(sql_literal(row[column]) for column in columns)
                lines.append(f"INSERT INTO {table.name} ({quoted_columns}) VALUES ({values});")
        (target / "database.sql").write_text("\n".join(lines) + "\n", encoding="utf-8")

    return target


def clean_uploads() -> int:
    removed = 0
    if not UPLOAD_DIR.exists():
        return removed
    backup_root = BACKUP_ROOT.resolve()
    for path in sorted(UPLOAD_DIR.rglob("*"), reverse=True):
        if str(path.resolve()).startswith(str(backup_root)):
            continue
        if path.is_file():
            path.unlink()
            removed += 1
        elif path.is_dir():
            try:
                path.rmdir()
            except OSError:
                pass
    return removed


def reset(confirm: bool) -> dict[str, Any]:
    app_env = os.getenv("APP_ENV", "development").lower()
    reset_enabled = os.getenv("DEMO_RESET_ENABLED", "false").lower() == "true"
    if app_env == "production":
        raise SystemExit("Refusing to reset MVP demo data in production.")
    if app_env not in {"development", "demo", "test"}:
        raise SystemExit(f"APP_ENV must be development or demo, got {app_env!r}.")
    if not reset_enabled:
        raise SystemExit("DEMO_RESET_ENABLED=true is required.")
    if not confirm:
        raise SystemExit("Use --confirm to reset the MVP demo data.")

    backup_path = create_backup()
    removed_files = clean_uploads()

    db = SessionLocal()
    try:
        with db.begin():
            for model in DELETE_ORDER:
                db.execute(delete(model))
        seed_mvp_recording(db)
    finally:
        db.close()

    return {"backup": str(backup_path), "removed_upload_files": removed_files, "seed_version": SEED_VERSION}


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset RITM-IA MVP recording demo data.")
    parser.add_argument("--confirm", action="store_true", help="Required guard to execute the reset.")
    args = parser.parse_args()
    result = reset(confirm=args.confirm)
    print("MVP demo reset: DONE")
    print(f"Seed version: {result['seed_version']}")
    print(f"Backup: {result['backup']}")
    print(f"Removed upload files: {result['removed_upload_files']}")


if __name__ == "__main__":
    main()
