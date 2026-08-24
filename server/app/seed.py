from sqlalchemy.orm import Session

from .database import SessionLocal
from .mvp_seed import seed_mvp_recording


def seed(db: Session | None = None) -> None:
    if db is not None:
        seed_mvp_recording(db)
        return

    db = SessionLocal()
    try:
        seed_mvp_recording(db)
    finally:
        db.close()


def main() -> None:
    seed()


if __name__ == "__main__":
    main()
