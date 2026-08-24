"""student material submissions

Revision ID: 0004_student_submissions
Revises: 0003_curriculum_catalog
Create Date: 2026-08-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_student_submissions"
down_revision: Union[str, None] = "0003_curriculum_catalog"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "student_material_submissions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("learning_unit_id", sa.String(), sa.ForeignKey("learning_units.id"), nullable=False),
        sa.Column("material_id", sa.String(), nullable=False),
        sa.Column("material_kind", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("notes", sa.Text(), server_default="", nullable=False),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("original_filename", sa.String(), nullable=True),
        sa.Column("mime_type", sa.String(), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), server_default="submitted", nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        *timestamps(),
    )


def downgrade() -> None:
    op.drop_table("student_material_submissions")
