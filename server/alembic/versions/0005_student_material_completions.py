"""student material completions

Revision ID: 0005_student_completions
Revises: 0004_student_submissions
Create Date: 2026-08-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_student_completions"
down_revision: Union[str, None] = "0004_student_submissions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "student_material_completions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("learning_unit_id", sa.String(), sa.ForeignKey("learning_units.id"), nullable=False),
        sa.Column("material_id", sa.String(), nullable=False),
        sa.Column("material_kind", sa.String(), nullable=False),
        sa.Column("completed", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.UniqueConstraint("student_id", "material_id", "material_kind", name="uq_student_material_completion"),
    )


def downgrade() -> None:
    op.drop_table("student_material_completions")
