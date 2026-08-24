"""content workflow expansion

Revision ID: 0002_content_workflow
Revises: 0001_initial
Create Date: 2026-07-28
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_content_workflow"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    op.add_column("learning_units", sa.Column("contents", sa.JSON(), server_default="[]", nullable=False))
    op.add_column("learning_units", sa.Column("planned_start_date", sa.String(), nullable=True))
    op.add_column("learning_units", sa.Column("planned_end_date", sa.String(), nullable=True))
    op.add_column("learning_units", sa.Column("status", sa.String(), server_default="draft", nullable=False))
    op.add_column("learning_units", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("learning_units", sa.Column("created_by", sa.String(), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("student_contexts", sa.Column("current_path", sa.String(), server_default="standard", nullable=False))
    op.add_column("generated_resources", sa.Column("version", sa.Integer(), server_default="1", nullable=False))
    op.add_column("generated_resources", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "base_materials",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("material_type", sa.String(), nullable=False),
        sa.Column("text_content", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("original_filename", sa.String(), nullable=True),
        sa.Column("mime_type", sa.String(), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("source_or_author", sa.String(), nullable=True),
        sa.Column("tags", sa.JSON(), server_default="[]", nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("status", sa.String(), server_default="draft", nullable=False),
        sa.Column("uploaded_by", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        *timestamps(),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "learning_unit_base_materials",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("learning_unit_id", sa.String(), sa.ForeignKey("learning_units.id"), nullable=False),
        sa.Column("base_material_id", sa.String(), sa.ForeignKey("base_materials.id"), nullable=False),
        sa.Column("display_order", sa.Integer(), server_default="1", nullable=False),
        sa.Column("is_required", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("learning_unit_id", "base_material_id", name="uq_unit_material"),
    )
    op.create_table(
        "generated_resource_sources",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("generated_resource_id", sa.String(), sa.ForeignKey("generated_resources.id"), nullable=False),
        sa.Column("base_material_id", sa.String(), sa.ForeignKey("base_materials.id"), nullable=False),
        sa.UniqueConstraint("generated_resource_id", "base_material_id", name="uq_resource_source"),
    )
    op.create_table(
        "generated_resource_units",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("generated_resource_id", sa.String(), sa.ForeignKey("generated_resources.id"), nullable=False),
        sa.Column("learning_unit_id", sa.String(), sa.ForeignKey("learning_units.id"), nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("generated_resource_id", "learning_unit_id", name="uq_resource_unit"),
    )
    op.create_table(
        "generated_resource_audiences",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("generated_resource_id", sa.String(), sa.ForeignKey("generated_resources.id"), nullable=False),
        sa.Column("audience_type", sa.String(), nullable=False),
        sa.Column("pathway", sa.String(), nullable=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_table(
        "resource_validations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("generated_resource_id", sa.String(), sa.ForeignKey("generated_resources.id"), nullable=False),
        sa.Column("teacher_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("technical_accuracy", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("unit_alignment", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("learning_outcome_alignment", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("evaluation_criteria_alignment", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("pathway_adequacy", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("clarity", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("difficulty_adequacy", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("accessibility", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("multiple_representation", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("action_expression", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("engagement", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("decision", sa.String(), server_default="pending", nullable=False),
        sa.Column("notes", sa.Text(), server_default="", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "student_path_history",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("previous_path", sa.String(), nullable=False),
        sa.Column("new_path", sa.String(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("teacher_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "material_consultations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("learning_unit_id", sa.String(), sa.ForeignKey("learning_units.id"), nullable=False),
        sa.Column("material_id", sa.String(), nullable=False),
        sa.Column("material_kind", sa.String(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), server_default="0", nullable=False),
        sa.Column("outside_school_hours", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_table(
        "material_feedback",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("material_id", sa.String(), nullable=False),
        sa.Column("material_kind", sa.String(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("useful", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("comment", sa.Text(), server_default="", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "student_progress",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("learning_unit_id", sa.String(), sa.ForeignKey("learning_units.id"), nullable=False),
        sa.Column("progress_percent", sa.Integer(), server_default="0", nullable=False),
        sa.Column("activities_completed", sa.Integer(), server_default="0", nullable=False),
        *timestamps(),
        sa.UniqueConstraint("student_id", "learning_unit_id", name="uq_student_unit_progress"),
    )
    op.create_table(
        "pedagogical_alerts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("learning_unit_id", sa.String(), sa.ForeignKey("learning_units.id"), nullable=True),
        sa.Column("alert_type", sa.String(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), server_default="open", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "teacher_interventions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("student_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("learning_unit_id", sa.String(), sa.ForeignKey("learning_units.id"), nullable=True),
        sa.Column("alert_id", sa.String(), sa.ForeignKey("pedagogical_alerts.id"), nullable=True),
        sa.Column("intervention_type", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("result_or_follow_up", sa.Text(), server_default="", nullable=False),
        sa.Column("teacher_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("follow_up_date", sa.String(), nullable=True),
        sa.Column("status", sa.String(), server_default="open", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "project_indicators",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("observed_value", sa.String(), server_default="sin datos", nullable=False),
        sa.Column("evidence", sa.JSON(), server_default="[]", nullable=False),
        sa.Column("period", sa.String(), server_default="MVP demo", nullable=False),
        sa.Column("status", sa.String(), server_default="sin datos", nullable=False),
        sa.Column("teacher_observation", sa.Text(), server_default="", nullable=False),
        *timestamps(),
    )


def downgrade() -> None:
    op.drop_table("project_indicators")
    op.drop_table("teacher_interventions")
    op.drop_table("pedagogical_alerts")
    op.drop_table("student_progress")
    op.drop_table("material_feedback")
    op.drop_table("material_consultations")
    op.drop_table("student_path_history")
    op.drop_table("resource_validations")
    op.drop_table("generated_resource_audiences")
    op.drop_table("generated_resource_units")
    op.drop_table("generated_resource_sources")
    op.drop_table("learning_unit_base_materials")
    op.drop_table("base_materials")
    op.drop_column("generated_resources", "reviewed_at")
    op.drop_column("generated_resources", "version")
    op.drop_column("student_contexts", "current_path")
    op.drop_column("learning_units", "created_by")
    op.drop_column("learning_units", "published_at")
    op.drop_column("learning_units", "status")
    op.drop_column("learning_units", "planned_end_date")
    op.drop_column("learning_units", "planned_start_date")
    op.drop_column("learning_units", "contents")
