"""curriculum catalog for mvp recording

Revision ID: 0003_curriculum_catalog
Revises: 0002_content_workflow
Create Date: 2026-07-31
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_curriculum_catalog"
down_revision: Union[str, None] = "0002_content_workflow"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "curriculum_learning_outcomes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("subject_id", "code", name="uq_curriculum_ra"),
    )
    op.create_table(
        "curriculum_evaluation_criteria",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("learning_outcome_id", sa.String(), sa.ForeignKey("curriculum_learning_outcomes.id"), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("learning_outcome_id", "code", name="uq_curriculum_ce"),
    )
    op.create_table(
        "curriculum_unit_templates",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("subject_id", sa.String(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("primary_learning_outcome_code", sa.String(), nullable=False),
        sa.Column("suggested_contents", sa.JSON(), server_default="[]", nullable=False),
        sa.Column("estimated_hours", sa.Integer(), server_default="0", nullable=False),
        sa.Column("display_order", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("subject_id", "code", name="uq_curriculum_ut_template"),
    )
    op.create_table(
        "demo_seed_metadata",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("demo_seed_metadata")
    op.drop_table("curriculum_unit_templates")
    op.drop_table("curriculum_evaluation_criteria")
    op.drop_table("curriculum_learning_outcomes")
