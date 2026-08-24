from typing import Any, Literal

from pydantic import BaseModel, Field


LearningPath = Literal["reinforcement", "standard", "extension"]
RequestMode = Literal["teacher_resource", "student_explanation", "student_resource"]


class SubjectPayload(BaseModel):
    name: str


class UnitPayload(BaseModel):
    id: str | None = None
    code: str
    title: str
    learning_outcome: str | None = None
    evaluation_criteria: list[str] = Field(default_factory=list)
    contents: list[str] = Field(default_factory=list)


class StudentContextPayload(BaseModel):
    prior_knowledge: str = ""
    recommended_path: LearningPath = "standard"
    current_path: LearningPath | None = None
    autonomy_level: str = ""
    weekly_availability: str = ""
    support_needs: str = ""
    content_preferences: str = ""
    detected_difficulties: str = ""
    teacher_notes: str = ""


class GenerateRequest(BaseModel):
    request_mode: RequestMode
    subject: SubjectPayload
    unit: UnitPayload
    student_context: StudentContextPayload
    module: dict[str, Any] | None = None
    units: list[dict[str, Any]] = Field(default_factory=list)
    base_materials: list[dict[str, Any]] = Field(default_factory=list)
    visible_materials: list[dict[str, Any]] = Field(default_factory=list)
    source_materials: list[dict[str, Any]] = Field(default_factory=list)
    audience: dict[str, Any] | None = None
    learning_path: LearningPath | None = None
    resource_type: str | None = None
    base_content: str | None = None
    teacher_instructions: str | None = None
    question: str | None = None
    topic: str | None = None


class GenerateResponse(BaseModel):
    title: str
    summary: str
    generated_content: str
    adaptations: dict[str, Any] = Field(default_factory=dict)
    key_points: list[str] = Field(default_factory=list)
    worked_example: str | None = None
    comprehension_question: str | None = None
    detected_topic: str | None = None
