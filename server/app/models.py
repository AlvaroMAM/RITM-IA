from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

JsonType = JSON().with_variant(JSONB, "postgresql")


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True)
    role: Mapped[str] = mapped_column(String)


class Subject(Base, TimestampMixin):
    __tablename__ = "subjects"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    course: Mapped[str] = mapped_column(String)
    academic_year: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    units: Mapped[list["LearningUnit"]] = relationship(back_populates="subject")


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("subject_id", "student_id", name="uq_enrollment"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"
    __table_args__ = (UniqueConstraint("subject_id", "teacher_id", name="uq_teacher_subject"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    teacher_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LearningUnit(Base, TimestampMixin):
    __tablename__ = "learning_units"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    code: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    learning_outcome: Mapped[str] = mapped_column(Text)
    evaluation_criteria: Mapped[list[str]] = mapped_column(JsonType)
    contents: Mapped[list[str]] = mapped_column(JsonType, default=list)
    unit_order: Mapped[int] = mapped_column(Integer)
    planned_start_date: Mapped[str | None] = mapped_column(String, nullable=True)
    planned_end_date: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    subject: Mapped[Subject] = relationship(back_populates="units")


class StudentContext(Base, TimestampMixin):
    __tablename__ = "student_contexts"
    __table_args__ = (UniqueConstraint("student_id", "subject_id", name="uq_student_context"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    prior_knowledge: Mapped[str] = mapped_column(Text)
    recommended_path: Mapped[str] = mapped_column(String)
    autonomy_level: Mapped[str] = mapped_column(String)
    weekly_availability: Mapped[str] = mapped_column(Text)
    support_needs: Mapped[str] = mapped_column(Text)
    content_preferences: Mapped[str] = mapped_column(Text)
    detected_difficulties: Mapped[str] = mapped_column(Text)
    teacher_notes: Mapped[str] = mapped_column(Text)
    current_path: Mapped[str] = mapped_column(String, default="standard")


class GeneratedResource(Base, TimestampMixin):
    __tablename__ = "generated_resources"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    teacher_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    learning_unit_id: Mapped[str] = mapped_column(ForeignKey("learning_units.id"))
    learning_path: Mapped[str] = mapped_column(String)
    resource_type: Mapped[str] = mapped_column(String)
    version: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(Text)
    base_content: Mapped[str] = mapped_column(Text)
    teacher_instructions: Mapped[str] = mapped_column(Text)
    generated_content: Mapped[str] = mapped_column(Text)
    adaptations: Mapped[dict] = mapped_column(JsonType)
    generated_by: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class BaseMaterial(Base, TimestampMixin):
    __tablename__ = "base_materials"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    material_type: Mapped[str] = mapped_column(String)
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String, nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_or_author: Mapped[str | None] = mapped_column(String, nullable=True)
    tags: Mapped[list[str]] = mapped_column(JsonType, default=list)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String, default="draft")
    uploaded_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LearningUnitBaseMaterial(Base):
    __tablename__ = "learning_unit_base_materials"
    __table_args__ = (UniqueConstraint("learning_unit_id", "base_material_id", name="uq_unit_material"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    learning_unit_id: Mapped[str] = mapped_column(ForeignKey("learning_units.id"))
    base_material_id: Mapped[str] = mapped_column(ForeignKey("base_materials.id"))
    display_order: Mapped[int] = mapped_column(Integer, default=1)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GeneratedResourceSource(Base):
    __tablename__ = "generated_resource_sources"
    __table_args__ = (UniqueConstraint("generated_resource_id", "base_material_id", name="uq_resource_source"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    generated_resource_id: Mapped[str] = mapped_column(ForeignKey("generated_resources.id"))
    base_material_id: Mapped[str] = mapped_column(ForeignKey("base_materials.id"))


class GeneratedResourceUnit(Base):
    __tablename__ = "generated_resource_units"
    __table_args__ = (UniqueConstraint("generated_resource_id", "learning_unit_id", name="uq_resource_unit"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    generated_resource_id: Mapped[str] = mapped_column(ForeignKey("generated_resources.id"))
    learning_unit_id: Mapped[str] = mapped_column(ForeignKey("learning_units.id"))
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class GeneratedResourceAudience(Base):
    __tablename__ = "generated_resource_audiences"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    generated_resource_id: Mapped[str] = mapped_column(ForeignKey("generated_resources.id"))
    audience_type: Mapped[str] = mapped_column(String)
    pathway: Mapped[str | None] = mapped_column(String, nullable=True)
    student_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)


class ResourceValidation(Base):
    __tablename__ = "resource_validations"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    generated_resource_id: Mapped[str] = mapped_column(ForeignKey("generated_resources.id"))
    teacher_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    technical_accuracy: Mapped[bool] = mapped_column(Boolean, default=False)
    unit_alignment: Mapped[bool] = mapped_column(Boolean, default=False)
    learning_outcome_alignment: Mapped[bool] = mapped_column(Boolean, default=False)
    evaluation_criteria_alignment: Mapped[bool] = mapped_column(Boolean, default=False)
    pathway_adequacy: Mapped[bool] = mapped_column(Boolean, default=False)
    clarity: Mapped[bool] = mapped_column(Boolean, default=False)
    difficulty_adequacy: Mapped[bool] = mapped_column(Boolean, default=False)
    accessibility: Mapped[bool] = mapped_column(Boolean, default=False)
    multiple_representation: Mapped[bool] = mapped_column(Boolean, default=False)
    action_expression: Mapped[bool] = mapped_column(Boolean, default=False)
    engagement: Mapped[bool] = mapped_column(Boolean, default=False)
    decision: Mapped[str] = mapped_column(String, default="pending")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StudentPathHistory(Base):
    __tablename__ = "student_path_history"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    previous_path: Mapped[str] = mapped_column(String)
    new_path: Mapped[str] = mapped_column(String)
    reason: Mapped[str] = mapped_column(Text)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MaterialConsultation(Base):
    __tablename__ = "material_consultations"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    learning_unit_id: Mapped[str] = mapped_column(ForeignKey("learning_units.id"))
    material_id: Mapped[str] = mapped_column(String)
    material_kind: Mapped[str] = mapped_column(String)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    outside_school_hours: Mapped[bool] = mapped_column(Boolean, default=False)


class MaterialFeedback(Base):
    __tablename__ = "material_feedback"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    material_id: Mapped[str] = mapped_column(String)
    material_kind: Mapped[str] = mapped_column(String)
    rating: Mapped[int] = mapped_column(Integer)
    useful: Mapped[bool] = mapped_column(Boolean, default=True)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StudentMaterialSubmission(Base, TimestampMixin):
    __tablename__ = "student_material_submissions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    learning_unit_id: Mapped[str] = mapped_column(ForeignKey("learning_units.id"))
    material_id: Mapped[str] = mapped_column(String)
    material_kind: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    notes: Mapped[str] = mapped_column(Text, default="")
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String, nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String, default="submitted")
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StudentMaterialCompletion(Base, TimestampMixin):
    __tablename__ = "student_material_completions"
    __table_args__ = (UniqueConstraint("student_id", "material_id", "material_kind", name="uq_student_material_completion"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    learning_unit_id: Mapped[str] = mapped_column(ForeignKey("learning_units.id"))
    material_id: Mapped[str] = mapped_column(String)
    material_kind: Mapped[str] = mapped_column(String)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class StudentProgress(Base, TimestampMixin):
    __tablename__ = "student_progress"
    __table_args__ = (UniqueConstraint("student_id", "learning_unit_id", name="uq_student_unit_progress"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    learning_unit_id: Mapped[str] = mapped_column(ForeignKey("learning_units.id"))
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    activities_completed: Mapped[int] = mapped_column(Integer, default=0)


class PedagogicalAlert(Base):
    __tablename__ = "pedagogical_alerts"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    learning_unit_id: Mapped[str | None] = mapped_column(ForeignKey("learning_units.id"), nullable=True)
    alert_type: Mapped[str] = mapped_column(String)
    reason: Mapped[str] = mapped_column(Text)
    evidence: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TeacherIntervention(Base):
    __tablename__ = "teacher_interventions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    learning_unit_id: Mapped[str | None] = mapped_column(ForeignKey("learning_units.id"), nullable=True)
    alert_id: Mapped[str | None] = mapped_column(ForeignKey("pedagogical_alerts.id"), nullable=True)
    intervention_type: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    result_or_follow_up: Mapped[str] = mapped_column(Text, default="")
    teacher_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    follow_up_date: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProjectIndicator(Base, TimestampMixin):
    __tablename__ = "project_indicators"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    code: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    observed_value: Mapped[str] = mapped_column(String, default="sin datos")
    evidence: Mapped[list[str]] = mapped_column(JsonType, default=list)
    period: Mapped[str] = mapped_column(String, default="MVP demo")
    status: Mapped[str] = mapped_column(String, default="sin datos")
    teacher_observation: Mapped[str] = mapped_column(Text, default="")


class CurriculumLearningOutcome(Base):
    __tablename__ = "curriculum_learning_outcomes"
    __table_args__ = (UniqueConstraint("subject_id", "code", name="uq_curriculum_ra"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    code: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CurriculumEvaluationCriterion(Base):
    __tablename__ = "curriculum_evaluation_criteria"
    __table_args__ = (UniqueConstraint("learning_outcome_id", "code", name="uq_curriculum_ce"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    learning_outcome_id: Mapped[str] = mapped_column(ForeignKey("curriculum_learning_outcomes.id"))
    code: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CurriculumUnitTemplate(Base):
    __tablename__ = "curriculum_unit_templates"
    __table_args__ = (UniqueConstraint("subject_id", "code", name="uq_curriculum_ut_template"),)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    code: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    primary_learning_outcome_code: Mapped[str] = mapped_column(String)
    suggested_contents: Mapped[list[str]] = mapped_column(JsonType, default=list)
    estimated_hours: Mapped[int] = mapped_column(Integer, default=0)
    display_order: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DemoSeedMetadata(Base):
    __tablename__ = "demo_seed_metadata"
    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class StudentExplanation(Base, TimestampMixin):
    __tablename__ = "student_explanations"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    subject_id: Mapped[str] = mapped_column(ForeignKey("subjects.id"))
    learning_unit_id: Mapped[str] = mapped_column(ForeignKey("learning_units.id"))
    question: Mapped[str] = mapped_column(Text)
    detected_topic: Mapped[str] = mapped_column(String)
    learning_path: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(Text)
    generated_content: Mapped[str] = mapped_column(Text)
    key_points: Mapped[list[str]] = mapped_column(JsonType)
    worked_example: Mapped[str] = mapped_column(Text)
    comprehension_question: Mapped[str] = mapped_column(Text)
    adaptations: Mapped[dict] = mapped_column(JsonType)
    generated_by: Mapped[str] = mapped_column(String)
