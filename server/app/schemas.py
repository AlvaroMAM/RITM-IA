from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["teacher", "student"]
LearningPath = Literal["reinforcement", "standard", "extension"]
UnitStatus = Literal["draft", "published", "archived"]
MaterialStatus = Literal["draft", "published", "archived"]
ResourceStatus = Literal["draft", "generated", "reviewed", "validated", "published", "discarded", "archived"]
TeacherResourceType = Literal[
    "explanation",
    "summary",
    "guided_exercise",
    "practical_activity",
    "extension_challenge",
    "audio",
    "mind_map",
]


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(OrmModel):
    id: str
    name: str
    email: str
    role: Role


class DemoLoginRequest(BaseModel):
    role: Role | None = None
    user_id: str | None = None


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=120)


class SubjectOut(OrmModel):
    id: str
    name: str
    course: str
    academic_year: str
    description: str


class UnitOut(OrmModel):
    id: str
    subject_id: str
    code: str
    title: str
    description: str
    learning_outcome: str
    evaluation_criteria: list[str]
    contents: list[str] = []
    unit_order: int
    planned_start_date: str | None = None
    planned_end_date: str | None = None
    status: str = "draft"
    published_at: datetime | None = None
    created_by: str | None = None


class StudentContextOut(OrmModel):
    id: str
    student_id: str
    subject_id: str
    prior_knowledge: str
    recommended_path: LearningPath
    current_path: LearningPath
    autonomy_level: str
    weekly_availability: str
    support_needs: str
    content_preferences: str
    detected_difficulties: str
    teacher_notes: str
    updated_at: datetime


class StudentContextUpdate(BaseModel):
    prior_knowledge: str | None = None
    recommended_path: LearningPath | None = None
    current_path: LearningPath | None = None
    autonomy_level: str | None = None
    weekly_availability: str | None = None
    support_needs: str | None = None
    content_preferences: str | None = None
    detected_difficulties: str | None = None
    teacher_notes: str | None = None


class ResourceGenerateRequest(BaseModel):
    student_id: str
    teacher_id: str
    subject_id: str
    learning_unit_id: str
    learning_path: LearningPath
    resource_type: TeacherResourceType
    base_content: str = Field(min_length=1, max_length=4000)
    teacher_instructions: str = Field(default="", max_length=2000)
    base_material_ids: list[str] = Field(default_factory=list)
    target_unit_ids: list[str] = Field(default_factory=list)
    audience_type: Literal["student", "pathway"] = "student"
    student_ids: list[str] = Field(default_factory=list)
    title: str | None = None


class UnitCreate(BaseModel):
    code: str = Field(min_length=1, max_length=30)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=4000)
    learning_outcome: str = Field(default="", max_length=2000)
    evaluation_criteria: list[str] = Field(default_factory=list)
    contents: list[str] = Field(default_factory=list)
    unit_order: int = 1
    planned_start_date: str | None = None
    planned_end_date: str | None = None
    created_by: str = "teacher-alvaro-aparicio"


class UnitPatch(BaseModel):
    code: str | None = None
    title: str | None = None
    description: str | None = None
    learning_outcome: str | None = None
    evaluation_criteria: list[str] | None = None
    contents: list[str] | None = None
    unit_order: int | None = None
    planned_start_date: str | None = None
    planned_end_date: str | None = None


class UnitReadiness(BaseModel):
    status: Literal["incomplete", "ready_to_publish", "published"]
    missing: list[str]


class BaseMaterialCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=4000)
    material_type: Literal["audio", "image", "pdf", "text", "video_url", "web_url", "external_document_url", "presentation", "source_code"]
    text_content: str | None = None
    url: str | None = None
    source_or_author: str | None = None
    tags: list[str] = Field(default_factory=list)
    uploaded_by: str = "teacher-alvaro-aparicio"


class BaseMaterialPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    material_type: str | None = None
    text_content: str | None = None
    url: str | None = None
    source_or_author: str | None = None
    tags: list[str] | None = None


class BaseMaterialOut(OrmModel):
    id: str
    subject_id: str
    title: str
    description: str
    material_type: str
    text_content: str | None = None
    url: str | None = None
    file_path: str | None = None
    original_filename: str | None = None
    mime_type: str | None = None
    file_size: int | None = None
    source_or_author: str | None = None
    tags: list[str]
    version: int
    status: str
    uploaded_by: str
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None


class UnitMaterialLinkCreate(BaseModel):
    base_material_id: str
    display_order: int = 1
    is_required: bool = True


class UnitMaterialLinkPatch(BaseModel):
    display_order: int | None = None
    is_required: bool | None = None


class UnitMaterialOut(OrmModel):
    id: str
    learning_unit_id: str
    base_material_id: str
    display_order: int
    is_required: bool
    created_at: datetime
    material: BaseMaterialOut | None = None


class AdaptiveGenerateRequest(BaseModel):
    teacher_id: str = "teacher-alvaro-aparicio"
    module_id: str
    unit_ids: list[str] = Field(min_length=1)
    base_material_ids: list[str] = Field(min_length=1)
    learning_path: LearningPath
    resource_type: TeacherResourceType
    audience_type: Literal["pathway", "student"] = "pathway"
    student_ids: list[str] = Field(default_factory=list)
    teacher_instructions: str = ""
    title: str | None = None


class ResourceValidationCreate(BaseModel):
    teacher_id: str = "teacher-alvaro-aparicio"
    technical_accuracy: bool = False
    unit_alignment: bool = False
    learning_outcome_alignment: bool = False
    evaluation_criteria_alignment: bool = False
    pathway_adequacy: bool = False
    clarity: bool = False
    difficulty_adequacy: bool = False
    accessibility: bool = False
    multiple_representation: bool = False
    action_expression: bool = False
    engagement: bool = False
    decision: Literal["pending", "validated", "needs_changes"] = "pending"
    notes: str = ""


class ResourceValidationOut(OrmModel):
    id: str
    generated_resource_id: str
    teacher_id: str
    technical_accuracy: bool
    unit_alignment: bool
    learning_outcome_alignment: bool
    evaluation_criteria_alignment: bool
    pathway_adequacy: bool
    clarity: bool
    difficulty_adequacy: bool
    accessibility: bool
    multiple_representation: bool
    action_expression: bool
    engagement: bool
    decision: str
    notes: str
    created_at: datetime


class PathChangeRequest(BaseModel):
    teacher_id: str = "teacher-alvaro-aparicio"
    new_path: LearningPath
    reason: str = Field(min_length=1)


class PathHistoryOut(OrmModel):
    id: str
    student_id: str
    subject_id: str
    previous_path: str
    new_path: str
    reason: str
    teacher_id: str
    created_at: datetime


class ConsultationCreate(BaseModel):
    student_id: str = "student-laura-garcia-morales"
    subject_id: str = "module-0377-asgbd"
    learning_unit_id: str = "unit-0377-ut1"
    material_kind: str = "base"


class FeedbackCreate(BaseModel):
    student_id: str = "student-laura-garcia-morales"
    material_id: str
    material_kind: str = "base"
    rating: int = Field(ge=1, le=5)
    useful: bool = True
    comment: str = ""


class InterventionCreate(BaseModel):
    teacher_id: str = "teacher-alvaro-aparicio"
    student_id: str
    learning_unit_id: str | None = None
    alert_id: str | None = None
    intervention_type: str
    description: str
    result_or_follow_up: str = ""
    follow_up_date: str | None = None
    status: str = "open"


class SimpleRecordOut(OrmModel):
    id: str
    created_at: datetime | None = None


class ModuleSummary(BaseModel):
    module: SubjectOut
    units_count: int
    published_units_count: int
    base_materials_count: int
    generated_resources_count: int
    students_count: int


class StudentTrackingRow(BaseModel):
    student: UserOut
    current_path: str
    recommended_path: str
    last_activity: str
    materials_consulted: int
    questions_count: int
    progress_percent: int
    alerts_count: int


class IndicatorOut(OrmModel):
    id: str
    subject_id: str
    code: str
    title: str
    observed_value: str
    evidence: list[str]
    period: str
    status: str
    teacher_observation: str
    updated_at: datetime


class ResourcePatch(BaseModel):
    title: str | None = None
    summary: str | None = None
    generated_content: str | None = None


class ResourceOut(OrmModel):
    id: str
    student_id: str
    teacher_id: str
    subject_id: str
    learning_unit_id: str
    learning_path: LearningPath
    resource_type: str
    title: str
    summary: str
    base_content: str
    teacher_instructions: str
    generated_content: str
    adaptations: dict[str, Any]
    generated_by: str
    status: ResourceStatus
    created_at: datetime
    updated_at: datetime
    validated_at: datetime | None
    published_at: datetime | None


class StudentMaterialSubmissionOut(OrmModel):
    id: str
    student_id: str
    subject_id: str
    learning_unit_id: str
    material_id: str
    material_kind: str
    title: str
    notes: str
    file_path: str | None = None
    original_filename: str | None = None
    mime_type: str | None = None
    file_size: int | None = None
    status: str
    submitted_at: datetime
    created_at: datetime
    updated_at: datetime


class StudentMaterialCompletionUpdate(BaseModel):
    material_kind: Literal["base", "adaptive"]
    completed: bool


class StudentMaterialCompletionOut(OrmModel):
    id: str
    student_id: str
    subject_id: str
    learning_unit_id: str
    material_id: str
    material_kind: str
    completed: bool
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ExplanationCreate(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    topic: str | None = Field(default=None, max_length=120)


class StudentAssistantRequest(ExplanationCreate):
    unit_ids: list[str] = Field(min_length=1)


class StudentGeneratedMaterialRequest(BaseModel):
    unit_ids: list[str] = Field(min_length=1)
    source_material_ids: list[str] = Field(default_factory=list)
    resource_type: Literal["explanation", "audio", "mind_map", "summary", "study_guide", "image"] = "explanation"
    prompt: str = Field(min_length=1, max_length=2000)
    title: str | None = Field(default=None, max_length=200)


class ExplanationOut(OrmModel):
    id: str
    student_id: str
    subject_id: str
    learning_unit_id: str
    question: str
    detected_topic: str
    learning_path: LearningPath
    title: str
    summary: str
    generated_content: str
    key_points: list[str]
    worked_example: str
    comprehension_question: str
    adaptations: dict[str, Any]
    generated_by: str
    created_at: datetime
