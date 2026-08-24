export const API_BASE = "/api";

function explainApiError(detail: unknown): string {
  if (typeof detail === "object" && detail !== null && "missing" in detail) {
    const missing = Array.isArray((detail as { missing?: unknown }).missing) ? (detail as { missing: string[] }).missing : [];
    return `No se puede publicar todavía. Revisa estos elementos pendientes: ${missing.join(", ")}.`;
  }
  if (typeof detail !== "string") {
    return "No se ha podido completar la operación. Revisa los datos introducidos y vuelve a intentarlo.";
  }

  const messages: Record<string, string> = {
    "Unit not found": "No se ha encontrado la unidad de trabajo en el servidor. Vuelve a seleccionar el módulo y la UT antes de publicar.",
    "Unit not available": "La unidad de trabajo todavía no está publicada para el alumnado.",
    "Unit does not belong to module": "La unidad seleccionada no pertenece a este módulo. Cambia de módulo o vuelve a seleccionar la UT.",
    "Subject not found": "No se ha encontrado el módulo seleccionado.",
    "Module not found": "No se ha encontrado el módulo seleccionado.",
    "Material not found": "No se ha encontrado el material seleccionado.",
    "Material does not belong to module": "El material seleccionado no pertenece a este módulo.",
    "Material is associated with units": "No se puede eliminar el material porque está asociado a una o varias unidades.",
    "File extension not allowed": "El tipo de archivo no está permitido. Puedes subir PDF, DOC/DOCX, TXT, PY, PNG, JPG o archivos de audio compatibles.",
    "MIME type not allowed": "El formato del archivo no se reconoce como válido. Prueba con PDF, DOC/DOCX, TXT, PY, PNG, JPG, MP3, WAV, OGG, M4A o WEBM.",
    "File too large": "El archivo es demasiado grande. El tamaño máximo permitido es de 50 MB.",
    "Material has no file": "Este material no tiene un archivo asociado para descargar.",
    "File not found": "No se ha encontrado el archivo asociado. Puede que haya sido eliminado o que la entrega no se haya completado correctamente.",
    "Submission not found": "No se ha encontrado la entrega del alumno.",
    "Study material does not accept submissions": "Este material de estudio no admite entrega de archivos porque no requiere correccion docente.",
    "Study material does not count for progress": "Este material de estudio personal no cuenta para el avance de la unidad.",
    "Material type does not match": "El tipo de material seleccionado no coincide con el registro del servidor. Actualiza la pagina y vuelve a intentarlo.",
    "Source material not available": "El material de partida seleccionado no esta disponible para las unidades elegidas. Vuelve a seleccionar el material.",
    "At least one base material is required": "Selecciona al menos un material base antes de generar el recurso.",
    "Only validated resources can be published": "Antes de publicar el recurso debe estar validado por el docente.",
    "Usuario o contraseña incorrectos": "Usuario o contraseña incorrectos.",
    "ai-service no disponible": "El servicio de IA no está disponible. Comprueba que Ollama y ai-service están arrancados.",
  };
  return messages[detail] ?? detail;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: "Error del servidor" }));
    throw new Error(explainApiError(detail.detail));
  }
  return response.json() as Promise<T>;
}

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: "teacher" | "student";
};

export type ApiStudentContext = {
  id: string;
  student_id: string;
  subject_id: string;
  prior_knowledge: string;
  recommended_path: "reinforcement" | "standard" | "extension";
  current_path: "reinforcement" | "standard" | "extension";
  autonomy_level: string;
  weekly_availability: string;
  support_needs: string;
  content_preferences: string;
  detected_difficulties: string;
  teacher_notes: string;
  updated_at: string;
};

export type ApiResource = {
  id: string;
  student_id: string;
  teacher_id: string;
  subject_id: string;
  learning_unit_id: string;
  learning_path: "reinforcement" | "standard" | "extension";
  resource_type: string;
  version?: number;
  title: string;
  summary: string;
  base_content: string;
  teacher_instructions: string;
  generated_content: string;
  adaptations: Record<string, unknown>;
  generated_by: string;
  status: "draft" | "generated" | "reviewed" | "validated" | "published" | "discarded" | "archived";
  created_at: string;
  updated_at: string;
  validated_at: string | null;
  published_at: string | null;
};

export type ApiSubject = {
  id: string;
  name: string;
  course: string;
  academic_year: string;
  description: string;
};

export type ApiUnit = {
  id: string;
  subject_id: string;
  code: string;
  title: string;
  description: string;
  learning_outcome: string;
  evaluation_criteria: string[];
  contents: string[];
  unit_order: number;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  status: "draft" | "published" | "archived";
  published_at?: string | null;
};

export type ApiBaseMaterial = {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  material_type: string;
  text_content?: string | null;
  url?: string | null;
  file_path?: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  tags: string[];
  version: number;
  status: "draft" | "published" | "archived";
  uploaded_by: string;
};

export type ApiStudentTrackingRow = {
  student: ApiUser;
  current_path: "reinforcement" | "standard" | "extension";
  recommended_path: "reinforcement" | "standard" | "extension";
  last_activity: string;
  materials_consulted: number;
  questions_count: number;
  progress_percent: number;
  alerts_count: number;
};

export type ApiStudentMaterialCompletion = {
  id: string;
  student_id: string;
  subject_id: string;
  learning_unit_id: string;
  material_id: string;
  material_kind: "base" | "adaptive";
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiIndicator = {
  id: string;
  subject_id: string;
  code: string;
  title: string;
  observed_value: string;
  evidence: string[];
  period: string;
  status: string;
  teacher_observation: string;
};

export type ApiExplanation = {
  id: string;
  question: string;
  detected_topic: string;
  learning_path: "reinforcement" | "standard" | "extension";
  title: string;
  summary: string;
  generated_content: string;
  key_points: string[];
  worked_example: string;
  comprehension_question: string;
  adaptations: Record<string, unknown>;
  created_at: string;
};

export type ApiStudentDetail = {
  student: ApiUser;
  module: ApiSubject;
  enrolled_modules: ApiSubject[];
  context: ApiStudentContext;
  progress: Array<{
    id: string;
    module: ApiSubject;
    unit: ApiUnit | null;
    progress_percent: number;
    activities_completed: number;
    updated_at: string;
  }>;
  materials: Array<{
    id: string;
    material_id: string;
    material_kind: string;
    title: string;
    module: ApiSubject;
    unit: ApiUnit | null;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    outside_school_hours: boolean;
  }>;
  generated_resources: Array<{
    id: string;
    title: string;
    status: ApiResource["status"];
    learning_path: ApiResource["learning_path"];
    resource_type: string;
    unit: ApiUnit | null;
    created_at: string;
    published_at: string | null;
  }>;
  student_generated_materials: Array<{
    id: string;
    title: string;
    status: ApiResource["status"];
    learning_path: ApiResource["learning_path"];
    resource_type: string;
    unit: ApiUnit | null;
    units: ApiUnit[];
    summary: string;
    generated_content: string;
    created_at: string;
    published_at: string | null;
  }>;
  submissions: Array<{
    id: string;
    student_id: string;
    subject_id: string;
    learning_unit_id: string;
    material_id: string;
    material_kind: string;
    title: string;
    notes: string;
    unit: ApiUnit | null;
    original_filename: string | null;
    mime_type: string | null;
    file_size: number | null;
    status: string;
    submitted_at: string;
    download_url: string | null;
  }>;
  questions: Array<{
    id: string;
    datetime: string;
    module: ApiSubject;
    unit: ApiUnit | null;
    question: string;
    detected_topic: string;
    learning_path: ApiResource["learning_path"];
    summary: string;
    generated_content: string;
  }>;
  path_history: Array<{ id: string; previous_path: string; new_path: string; reason: string; created_at: string }>;
  alerts: Array<{
    id: string;
    unit: ApiUnit | null;
    alert_type: string;
    reason: string;
    evidence: string;
    status: string;
    created_at: string;
  }>;
  interventions: Array<{
    id: string;
    unit: ApiUnit | null;
    intervention_type: string;
    description: string;
    result_or_follow_up: string;
    status: string;
    created_at: string;
  }>;
  feedback: Array<{ id: string; material_id: string; material_kind: string; rating: number; useful: boolean; comment: string; created_at: string }>;
};

export type ApiStudentSubmission = ApiStudentDetail["submissions"][number];

export const api = {
  login: (username: string, password: string) =>
    request<ApiUser>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  teacherModules: () => request<ApiSubject[]>("/teacher/modules"),
  studentModules: (studentId: string) => request<ApiSubject[]>(`/student/modules?student_id=${studentId}`),
  studentModuleUnits: (moduleId: string, studentId: string) =>
    request<ApiUnit[]>(`/student/modules/${moduleId}/units?student_id=${studentId}`),
  moduleUnits: (moduleId: string) => request<ApiUnit[]>(`/modules/${moduleId}/units`),
  createUnit: (moduleId: string, payload: Record<string, unknown>) =>
    request<ApiUnit>(`/modules/${moduleId}/units`, { method: "POST", body: JSON.stringify(payload) }),
  patchUnit: (moduleId: string, unitId: string, payload: Record<string, unknown>) =>
    request<ApiUnit>(`/modules/${moduleId}/units/${unitId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteUnit: (moduleId: string, unitId: string) =>
    request<{ status: string }>(`/modules/${moduleId}/units/${unitId}`, { method: "DELETE" }),
  publishUnit: (moduleId: string, unitId: string) =>
    request<ApiUnit>(`/modules/${moduleId}/units/${unitId}/publish`, { method: "POST" }),
  unitReadiness: (moduleId: string, unitId: string) =>
    request<{ status: string; missing: string[] }>(`/modules/${moduleId}/units/${unitId}/readiness`),
  baseMaterials: (moduleId: string, unitIds: string[] = []) => {
    const query = unitIds.map((id) => `unit_ids=${encodeURIComponent(id)}`).join("&");
    return request<ApiBaseMaterial[]>(`/modules/${moduleId}/base-materials${query ? `?${query}` : ""}`);
  },
  createBaseMaterial: (moduleId: string, payload: Record<string, unknown>) =>
    request<ApiBaseMaterial>(`/modules/${moduleId}/base-materials`, { method: "POST", body: JSON.stringify(payload) }),
  uploadBaseMaterialFile: async (moduleId: string, materialId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE}/modules/${moduleId}/base-materials/${materialId}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({ detail: "Error del servidor" }));
      throw new Error(explainApiError(detail.detail));
    }
    return response.json() as Promise<ApiBaseMaterial>;
  },
  baseMaterialDownloadUrl: (moduleId: string, materialId: string) =>
    `${API_BASE}/modules/${moduleId}/base-materials/${materialId}/download`,
  publishBaseMaterial: (moduleId: string, materialId: string) =>
    request<ApiBaseMaterial>(`/modules/${moduleId}/base-materials/${materialId}/publish`, { method: "POST" }),
  deleteBaseMaterial: (moduleId: string, materialId: string) =>
    request<{ status: string }>(`/modules/${moduleId}/base-materials/${materialId}`, { method: "DELETE" }),
  linkUnitMaterial: (moduleId: string, unitId: string, baseMaterialId: string) =>
    request(`/modules/${moduleId}/units/${unitId}/base-materials`, {
      method: "POST",
      body: JSON.stringify({ base_material_id: baseMaterialId }),
    }),
  adaptiveGenerate: (payload: Record<string, unknown>) =>
    request<ApiResource>("/adaptive-resources/generate", { method: "POST", body: JSON.stringify(payload) }),
  adaptiveValidate: (resourceId: string, payload: Record<string, unknown>) =>
    request<ApiResource>(`/adaptive-resources/${resourceId}/validate`, { method: "POST", body: JSON.stringify(payload) }),
  adaptivePublish: (resourceId: string) =>
    request<ApiResource>(`/adaptive-resources/${resourceId}/publish`, { method: "POST" }),
  adaptiveDiscard: (resourceId: string) =>
    request<ApiResource>(`/adaptive-resources/${resourceId}/discard`, { method: "POST" }),
  moduleGeneratedResources: (moduleId: string, unitIds: string[] = []) => {
    const query = unitIds.map((id) => `unit_ids=${encodeURIComponent(id)}`).join("&");
    return request<ApiResource[]>(`/modules/${moduleId}/generated-resources${query ? `?${query}` : ""}`);
  },
  moduleTracking: (moduleId: string) => request<ApiStudentTrackingRow[]>(`/modules/${moduleId}/students`),
  studentDetail: (moduleId: string, studentId: string) =>
    request<ApiStudentDetail>(`/modules/${moduleId}/students/${studentId}/detail`),
  pathHistory: (moduleId: string, studentId: string) =>
    request<Array<{ id: string; previous_path: string; new_path: string; reason: string; created_at: string }>>(
      `/modules/${moduleId}/students/${studentId}/path-history`,
    ),
  changePath: (moduleId: string, studentId: string, newPath: string, reason: string) =>
    request(`/modules/${moduleId}/students/${studentId}/change-path`, {
      method: "POST",
      body: JSON.stringify({ new_path: newPath, reason }),
    }),
  moduleAlerts: (moduleId: string) => request<Array<Record<string, unknown>>>(`/modules/${moduleId}/alerts`),
  moduleIndicators: (moduleId: string) => request<ApiIndicator[]>(`/modules/${moduleId}/indicators`),
  studentUnitMaterials: (moduleId: string, unitId: string, studentId: string) =>
    request<{ standard_materials: ApiBaseMaterial[]; adaptive_resources: ApiResource[]; current_path: string }>(
      `/student/modules/${moduleId}/units/${unitId}/materials?student_id=${studentId}`,
    ),
  studentMaterialCompletions: (studentId: string, subjectId?: string) =>
    request<ApiStudentMaterialCompletion[]>(
      `/students/${studentId}/material-completions${subjectId ? `?subject_id=${encodeURIComponent(subjectId)}` : ""}`,
    ),
  setStudentMaterialCompletion: (
    moduleId: string,
    unitId: string,
    materialId: string,
    studentId: string,
    payload: { material_kind: "base" | "adaptive"; completed: boolean },
  ) =>
    request<ApiStudentMaterialCompletion>(
      `/student/modules/${moduleId}/units/${unitId}/materials/${materialId}/completion?student_id=${studentId}`,
      { method: "PUT", body: JSON.stringify(payload) },
    ),
  startMaterialConsultation: (materialId: string, payload: Record<string, unknown>) =>
    request<{ id: string; created_at: string | null }>(`/materials/${materialId}/consultations/start`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  finishMaterialConsultation: (materialId: string, consultationId: string) =>
    request<{ id: string; created_at: string | null }>(`/materials/${materialId}/consultations/${consultationId}/finish`, {
      method: "POST",
    }),
  uploadStudentSubmission: async (moduleId: string, unitId: string, materialId: string, studentId: string, file: File, notes = "") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("notes", notes);
    const response = await fetch(
      `${API_BASE}/student/modules/${moduleId}/units/${unitId}/materials/${materialId}/submissions?student_id=${studentId}`,
      {
        method: "POST",
        body: formData,
      },
    );
    if (!response.ok) {
      const detail = await response.json().catch(() => ({ detail: "Error del servidor" }));
      throw new Error(explainApiError(detail.detail));
    }
    return response.json() as Promise<ApiStudentSubmission>;
  },
  studentSubmissionDownloadUrl: (submissionId: string) => `${API_BASE}/student-submissions/${submissionId}/download`,
  students: (subjectId: string) => request<ApiUser[]>(`/subjects/${subjectId}/students`),
  studentContext: (studentId: string, subjectId: string) =>
    request<ApiStudentContext>(`/students/${studentId}/context?subject_id=${subjectId}`),
  updateStudentContext: (studentId: string, context: Partial<ApiStudentContext>, subjectId: string) =>
    request<ApiStudentContext>(`/students/${studentId}/context?subject_id=${subjectId}`, {
      method: "PUT",
      body: JSON.stringify(context),
    }),
  generateResource: (payload: Record<string, unknown>) =>
    request<ApiResource>("/resources/generate", { method: "POST", body: JSON.stringify(payload) }),
  patchResource: (resourceId: string, payload: Partial<ApiResource>) =>
    request<ApiResource>(`/resources/${resourceId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  validateResource: (resourceId: string) =>
    request<ApiResource>(`/resources/${resourceId}/validate`, { method: "POST" }),
  publishResource: (resourceId: string) =>
    request<ApiResource>(`/resources/${resourceId}/publish`, { method: "POST" }),
  discardResource: (resourceId: string) =>
    request<ApiResource>(`/resources/${resourceId}/discard`, { method: "POST" }),
  studentResources: (studentId: string, status = "published") =>
    request<ApiResource[]>(`/students/${studentId}/resources?status=${status}`),
  createExplanation: (studentId: string, unitId: string, question: string, topic?: string) =>
    request<ApiExplanation>(`/students/${studentId}/units/${unitId}/explanations`, {
      method: "POST",
      body: JSON.stringify({ question, topic }),
    }),
  studentAssistantChat: (moduleId: string, unitIds: string[], question: string, topic: string | undefined, studentId: string) =>
    request<ApiExplanation>(`/student/modules/${moduleId}/assistant?student_id=${studentId}`, {
      method: "POST",
      body: JSON.stringify({ unit_ids: unitIds, question, topic }),
    }),
  studentGenerateMaterial: (moduleId: string, payload: Record<string, unknown>, studentId: string) =>
    request<ApiResource>(`/student/modules/${moduleId}/generated-materials?student_id=${studentId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  explanationHistory: (studentId: string, unitId: string) =>
    request<ApiExplanation[]>(`/students/${studentId}/units/${unitId}/explanations`),
};
