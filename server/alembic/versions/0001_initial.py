"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("role", sa.String(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "subjects",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("course", sa.String(), nullable=False),
        sa.Column("academic_year", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "teacher_subjects",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("teacher_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("subject_id", "teacher_id", name="uq_teacher_subject"),
    )
    op.create_table(
        "enrollments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("subject_id", "student_id", name="uq_enrollment"),
    )
    op.create_table(
        "learning_units",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("learning_outcome", sa.Text(), nullable=False),
        sa.Column("evaluation_criteria", sa.JSON(), nullable=False),
        sa.Column("unit_order", sa.Integer(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "student_contexts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("prior_knowledge", sa.Text(), nullable=False),
        sa.Column("recommended_path", sa.String(), nullable=False),
        sa.Column("autonomy_level", sa.String(), nullable=False),
        sa.Column("weekly_availability", sa.Text(), nullable=False),
        sa.Column("support_needs", sa.Text(), nullable=False),
        sa.Column("content_preferences", sa.Text(), nullable=False),
        sa.Column("detected_difficulties", sa.Text(), nullable=False),
        sa.Column("teacher_notes", sa.Text(), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("student_id", "subject_id", name="uq_student_context"),
    )
    op.create_table(
        "generated_resources",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("teacher_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("learning_unit_id", sa.String(), sa.ForeignKey("learning_units.id"), nullable=False),
        sa.Column("learning_path", sa.String(), nullable=False),
        sa.Column("resource_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("base_content", sa.Text(), nullable=False),
        sa.Column("teacher_instructions", sa.Text(), nullable=False),
        sa.Column("generated_content", sa.Text(), nullable=False),
        sa.Column("adaptations", sa.JSON(), nullable=False),
        sa.Column("generated_by", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        *timestamps(),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "student_explanations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("learning_unit_id", sa.String(), sa.ForeignKey("learning_units.id"), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("detected_topic", sa.String(), nullable=False),
        sa.Column("learning_path", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("generated_content", sa.Text(), nullable=False),
        sa.Column("key_points", sa.JSON(), nullable=False),
        sa.Column("worked_example", sa.Text(), nullable=False),
        sa.Column("comprehension_question", sa.Text(), nullable=False),
        sa.Column("adaptations", sa.JSON(), nullable=False),
        sa.Column("generated_by", sa.String(), nullable=False),
        *timestamps(),
    )


def downgrade() -> None:
    op.drop_table("student_explanations")
    op.drop_table("generated_resources")
    op.drop_table("student_contexts")
    op.drop_table("learning_units")
    op.drop_table("enrollments")
    op.drop_table("teacher_subjects")
    op.drop_table("subjects")
    op.drop_table("users")
