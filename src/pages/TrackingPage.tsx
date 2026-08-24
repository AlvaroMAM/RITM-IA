import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, type ApiStudentContext, type ApiStudentDetail, type ApiStudentTrackingRow, type ApiSubject, type ApiUser } from "../api/client";
import { Icon } from "../components/ui/Icon";
import { LoadingState } from "../components/ui/LoadingState";
import { ProgressBar } from "../components/ui/ProgressBar";

const pathLabels = {
  reinforcement: "Refuerzo",
  standard: "Estandar",
  extension: "Ampliacion",
};

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function secondsToMinutes(value?: number | null) {
  if (!value) return "Sin duracion";
  const minutes = Math.max(1, Math.round(value / 60));
  return `${minutes} min`;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-outline-soft bg-surface p-4">
      <h3 className="text-lg font-bold text-primary">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StudentDetailModal({
  detail,
  loading,
  modules,
  selectedModuleId,
  pathChangeReason,
  onModuleChange,
  onPathChange,
  onReasonChange,
  onClose,
}: {
  detail: ApiStudentDetail | null;
  loading: boolean;
  modules: ApiSubject[];
  selectedModuleId: string;
  pathChangeReason: string;
  onModuleChange: (moduleId: string) => void;
  onPathChange: (newPath: "reinforcement" | "standard" | "extension") => void;
  onReasonChange: (value: string) => void;
  onClose: () => void;
}) {
  type EditableContext = Pick<
    ApiStudentContext,
    "prior_knowledge" | "autonomy_level" | "support_needs" | "content_preferences" | "teacher_notes"
  >;

  const emptyContext: EditableContext = {
    prior_knowledge: "",
    autonomy_level: "",
    support_needs: "",
    content_preferences: "",
    teacher_notes: "",
  };
  const [contextDraft, setContextDraft] = useState<EditableContext>(emptyContext);
  const [contextStatus, setContextStatus] = useState("");
  const [previewMaterial, setPreviewMaterial] = useState<ApiStudentDetail["student_generated_materials"][number] | null>(null);

  useEffect(() => {
    if (!detail) {
      setContextDraft(emptyContext);
      setContextStatus("");
      return;
    }
    setContextDraft({
      prior_knowledge: detail.context.prior_knowledge,
      autonomy_level: detail.context.autonomy_level,
      support_needs: detail.context.support_needs,
      content_preferences: detail.context.content_preferences,
      teacher_notes: detail.context.teacher_notes,
    });
    setContextStatus("");
    setPreviewMaterial(null);
  }, [detail?.context.id]);

  const updateContextDraft = (field: keyof EditableContext, value: string) => {
    setContextDraft((current) => ({ ...current, [field]: value }));
  };

  const saveEducationalContext = async () => {
    if (!detail) return;
    try {
      if (selectedModuleId.startsWith("module-")) {
        await api.updateStudentContext(detail.student.id, contextDraft, selectedModuleId);
      }
      detail.context.prior_knowledge = contextDraft.prior_knowledge;
      detail.context.autonomy_level = contextDraft.autonomy_level;
      detail.context.support_needs = contextDraft.support_needs;
      detail.context.content_preferences = contextDraft.content_preferences;
      detail.context.teacher_notes = contextDraft.teacher_notes;
      detail.context.updated_at = new Date().toISOString();
      setContextStatus("Informacion educativa guardada.");
    } catch (error) {
      setContextStatus(error instanceof Error ? error.message : "No se pudo guardar la informacion educativa.");
    }
  };

  const studentGeneratedIds = new Set(detail?.student_generated_materials.map((resource) => resource.id) ?? []);
  const studentGeneratedConsultations =
    detail?.materials.filter((material) => studentGeneratedIds.has(material.material_id)).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={onClose}>
      <section
        className="card relative flex h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="focus-ring absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary bg-surface text-primary shadow-soft transition hover:bg-primary hover:text-white"
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle del alumno"
        >
          <Icon name="x" className="h-5 w-5" />
        </button>
        <header className="shrink-0 border-b border-outline-soft bg-surface-low p-5 pr-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-primary">Detalle del alumno</p>
            <h2 id="student-detail-title" className="mt-1 text-2xl font-bold">
              {detail?.student.name ?? "Cargando alumno"}
            </h2>
            <p className="text-text-muted">{detail?.student.email}</p>
          </div>
          <div className="flex flex-col gap-3 md:min-w-80">
            <label>
              <span className="field-label">Filtrar estadisticas por modulo</span>
              <select className="field" value={selectedModuleId} onChange={(event) => onModuleChange(event.target.value)}>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-secondary px-4" type="button" onClick={onClose} aria-label="Cerrar detalle del alumno">
              <Icon name="x" />
              Cerrar
            </button>
          </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-10">
          {loading ? <LoadingState label="Cargando informacion completa del alumno" /> : null}
          {!loading && detail ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <article className="rounded-md bg-surface-low p-4">
                  <p className="text-sm text-text-muted">Modulo actual</p>
                  <p className="mt-1 font-bold">{detail.module.name}</p>
                </article>
                <article className="rounded-md bg-surface-low p-4">
                  <p className="text-sm text-text-muted">Itinerario actual</p>
                  <p className="mt-1 font-bold">{pathLabels[detail.context.current_path]}</p>
                </article>
                <article className="rounded-md bg-surface-low p-4">
                  <p className="text-sm text-text-muted">Preguntas IA</p>
                  <p className="mt-1 text-2xl font-bold">{detail.questions.length}</p>
                </article>
                <article className="rounded-md bg-surface-low p-4">
                  <p className="text-sm text-text-muted">Materiales consultados</p>
                  <p className="mt-1 text-2xl font-bold">{detail.materials.length}</p>
                </article>
                <article className="rounded-md bg-surface-low p-4">
                  <p className="text-sm text-text-muted">Materiales generados</p>
                  <p className="mt-1 text-2xl font-bold">{detail.student_generated_materials.length}</p>
                </article>
                <article className="rounded-md bg-surface-low p-4">
                  <p className="text-sm text-text-muted">Consultas de sus materiales</p>
                  <p className="mt-1 text-2xl font-bold">{studentGeneratedConsultations}</p>
                </article>
              </div>

              <DetailSection title="Cambio manual de itinerario">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <label>
                    <span className="field-label">Motivo obligatorio</span>
                    <textarea
                      className="field min-h-24"
                      value={pathChangeReason}
                      onChange={(event) => onReasonChange(event.target.value)}
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
                    {(["reinforcement", "standard", "extension"] as const).map((path) => (
                      <button
                        key={path}
                        className="button-secondary px-3 text-sm"
                        type="button"
                        onClick={() => onPathChange(path)}
                        disabled={!pathChangeReason.trim()}
                      >
                        {pathLabels[path]}
                      </button>
                    ))}
                  </div>
                </div>
              </DetailSection>

              <div className="grid gap-5 xl:grid-cols-2">
                <DetailSection title="Informacion educativa">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label>
                      <span className="field-label">Conocimientos previos</span>
                      <textarea
                        className="field min-h-24"
                        value={contextDraft.prior_knowledge}
                        onChange={(event) => updateContextDraft("prior_knowledge", event.target.value)}
                      />
                    </label>
                    <label>
                      <span className="field-label">Autonomia</span>
                      <input
                        className="field"
                        value={contextDraft.autonomy_level}
                        onChange={(event) => updateContextDraft("autonomy_level", event.target.value)}
                      />
                    </label>
                    <label>
                      <span className="field-label">Necesidades de apoyo</span>
                      <textarea
                        className="field min-h-24"
                        value={contextDraft.support_needs}
                        onChange={(event) => updateContextDraft("support_needs", event.target.value)}
                      />
                    </label>
                    <label>
                      <span className="field-label">Preferencias</span>
                      <textarea
                        className="field min-h-24"
                        value={contextDraft.content_preferences}
                        onChange={(event) => updateContextDraft("content_preferences", event.target.value)}
                      />
                    </label>
                    <label className="md:col-span-2">
                      <span className="field-label">Notas docentes</span>
                      <textarea
                        className="field min-h-24"
                        value={contextDraft.teacher_notes}
                        onChange={(event) => updateContextDraft("teacher_notes", event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-text-muted">Campos cumplimentables a partir de la evaluacion inicial.</p>
                    <button className="button-primary" type="button" onClick={saveEducationalContext}>
                      Guardar informacion educativa
                    </button>
                  </div>
                  {contextStatus ? (
                    <p className="mt-3 rounded-md border border-primary/20 bg-primary/10 p-3 text-sm font-bold text-primary" role="status">
                      {contextStatus}
                    </p>
                  ) : null}
                </DetailSection>

                <DetailSection title="Asignaturas en las que esta matriculado">
                  <div className="space-y-2">
                    {detail.enrolled_modules.map((module) => (
                      <article key={module.id} className="rounded-md bg-surface-low p-3">
                        <p className="font-bold">{module.name}</p>
                        <p className="text-sm text-text-muted">
                          {module.course} · {module.academic_year}
                        </p>
                      </article>
                    ))}
                  </div>
                </DetailSection>
              </div>

              <DetailSection title="Progreso por unidades">
                {detail.progress.length === 0 ? (
                  <p className="text-sm text-text-muted">No hay progreso registrado para este modulo.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {detail.progress.map((item) => (
                      <article key={item.id} className="rounded-md border border-outline-soft p-3">
                        <p className="font-bold">
                          {item.unit?.code}. {item.unit?.title}
                        </p>
                        <ProgressBar value={item.progress_percent} label="Progreso" />
                        <p className="mt-2 text-sm text-text-muted">
                          {item.activities_completed} actividades completadas · Actualizado {formatDate(item.updated_at)}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </DetailSection>

              <div className="grid gap-5 xl:grid-cols-2">
                <DetailSection title="Materiales consultados">
                  {detail.materials.length === 0 ? (
                    <p className="text-sm text-text-muted">Sin consultas de materiales para este modulo.</p>
                  ) : (
                    <div className="space-y-3">
                      {detail.materials.map((item) => (
                        <article key={item.id} className="rounded-md bg-surface-low p-3 text-sm">
                          <p className="font-bold">{item.title}</p>
                          <p className="text-text-muted">
                            {formatDate(item.started_at)} · {item.unit?.code ?? "UT"} · {secondsToMinutes(item.duration_seconds)}
                          </p>
                          <p className="text-text-muted">{item.outside_school_hours ? "Consulta fuera del horario lectivo" : "Consulta en horario lectivo"}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </DetailSection>

                <DetailSection title="Recursos generados visibles">
                  {detail.generated_resources.length === 0 ? (
                    <p className="text-sm text-text-muted">Sin recursos adaptados visibles para este modulo.</p>
                  ) : (
                    <div className="space-y-3">
                      {detail.generated_resources.map((resource) => (
                        <article key={resource.id} className="rounded-md bg-surface-low p-3 text-sm">
                          <p className="font-bold">{resource.title}</p>
                          <p className="text-text-muted">
                            {pathLabels[resource.learning_path]} · {resource.status} · {resource.unit?.code ?? "UT"}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </DetailSection>
              </div>

              <DetailSection title="Materiales generados por el alumno">
                {detail.student_generated_materials.length === 0 ? (
                  <p className="text-sm text-text-muted">Sin materiales generados por el alumno para este modulo.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-low text-text-muted">
                        <tr>
                          <th className="p-3">Nombre</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">UT</th>
                          <th className="p-3">Consultas</th>
                          <th className="p-3">Accion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.student_generated_materials.map((resource) => (
                          <tr key={resource.id} className="border-t border-outline-soft">
                            <td className="min-w-64 p-3 font-bold">{resource.title}</td>
                            <td className="p-3">{resource.resource_type}</td>
                            <td className="min-w-52 p-3">
                              {(resource.units.length ? resource.units : resource.unit ? [resource.unit] : [])
                                .map((unit) => unit.code)
                                .join(", ") || "UT"}
                            </td>
                            <td className="p-3">
                              {detail.materials.filter((material) => material.material_id === resource.id).length}
                            </td>
                            <td className="p-3">
                              <button className="button-secondary whitespace-nowrap px-3 py-2 text-sm" type="button" onClick={() => setPreviewMaterial(resource)}>
                                Visualizar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DetailSection>

              <DetailSection title="Respuestas entregadas por el alumno">
                {detail.submissions.length === 0 ? (
                  <p className="text-sm text-text-muted">Sin respuestas entregadas para este modulo.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-low text-text-muted">
                        <tr>
                          <th className="p-3">Material</th>
                          <th className="p-3">UT</th>
                          <th className="p-3">Archivo</th>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Accion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.submissions.map((submission) => (
                          <tr key={submission.id} className="border-t border-outline-soft">
                            <td className="min-w-64 p-3">
                              <p className="font-bold">{submission.title}</p>
                              {submission.notes ? <p className="mt-1 text-text-muted">{submission.notes}</p> : null}
                            </td>
                            <td className="min-w-52 p-3">
                              {submission.unit ? `${submission.unit.code}. ${submission.unit.title}` : "UT"}
                            </td>
                            <td className="min-w-48 p-3">{submission.original_filename ?? "Archivo entregado"}</td>
                            <td className="p-3">{formatDate(submission.submitted_at)}</td>
                            <td className="p-3">
                              <a
                                className="button-secondary whitespace-nowrap px-3 py-2 text-sm"
                                href={api.studentSubmissionDownloadUrl(submission.id)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Visualizar
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DetailSection>

              <DetailSection title="Historico del chat con la IA">
                {detail.questions.length === 0 ? (
                  <p className="text-sm text-text-muted">No hay preguntas registradas para este modulo.</p>
                ) : (
                  <div className="space-y-3">
                    {detail.questions.map((question) => (
                      <article key={question.id} className="rounded-md border border-outline-soft p-3">
                        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                          <p className="font-bold">{question.question}</p>
                          <span className="text-sm text-text-muted">{formatDate(question.datetime)}</span>
                        </div>
                        <p className="mt-1 text-sm text-text-muted">
                          Modulo: {question.module.name} · Unidad: {question.unit?.code} {question.unit?.title}
                        </p>
                        <p className="mt-2 text-sm">{question.summary}</p>
                      </article>
                    ))}
                  </div>
                )}
              </DetailSection>

              <div className="grid gap-5 xl:grid-cols-3">
                <DetailSection title="Historico de itinerarios">
                  {detail.path_history.length === 0 ? (
                    <p className="text-sm text-text-muted">Sin cambios registrados para este modulo.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.path_history.map((item) => (
                        <article key={item.id} className="rounded-md bg-surface-low p-3 text-sm">
                          <p className="font-bold">
                            {pathLabels[item.previous_path as keyof typeof pathLabels] ?? item.previous_path} -&gt;{" "}
                            {pathLabels[item.new_path as keyof typeof pathLabels] ?? item.new_path}
                          </p>
                          <p className="text-text-muted">{formatDate(item.created_at)}</p>
                          <p>{item.reason}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </DetailSection>

                <DetailSection title="Alertas pedagogicas">
                  {detail.alerts.length === 0 ? (
                    <p className="text-sm text-text-muted">Sin alertas para este modulo.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.alerts.map((alert) => (
                        <article key={alert.id} className="rounded-md bg-surface-low p-3 text-sm">
                          <p className="font-bold">{alert.reason}</p>
                          <p className="text-text-muted">{alert.evidence}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </DetailSection>

                <DetailSection title="Intervenciones docentes">
                  {detail.interventions.length === 0 ? (
                    <p className="text-sm text-text-muted">Sin intervenciones para este modulo.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.interventions.map((item) => (
                        <article key={item.id} className="rounded-md bg-surface-low p-3 text-sm">
                          <p className="font-bold">{item.intervention_type}</p>
                          <p>{item.description}</p>
                          <p className="text-text-muted">{item.result_or_follow_up}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </DetailSection>
              </div>
            </div>
          ) : null}
        </div>
        {previewMaterial ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={() => setPreviewMaterial(null)}>
            <article
              className="card flex max-h-[calc(100vh-5rem)] w-full max-w-4xl flex-col overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="student-material-preview-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header className="shrink-0 border-b border-outline-soft bg-surface-low p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.08em] text-primary">Material generado por alumno</p>
                    <h3 id="student-material-preview-title" className="mt-1 text-2xl font-bold">
                      {previewMaterial.title}
                    </h3>
                    <p className="text-text-muted">
                      {(previewMaterial.units.length ? previewMaterial.units : previewMaterial.unit ? [previewMaterial.unit] : [])
                        .map((unit) => `${unit.code} ${unit.title}`)
                        .join(", ")}
                    </p>
                  </div>
                  <button className="button-secondary" type="button" onClick={() => setPreviewMaterial(null)}>
                    <Icon name="x" />
                    Cerrar
                  </button>
                </div>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <p className="rounded-md bg-surface-low p-4 font-bold text-primary">{previewMaterial.summary}</p>
                <div className="mt-5 whitespace-pre-line rounded-md border border-outline-soft bg-surface p-5 text-sm leading-relaxed">
                  {previewMaterial.generated_content}
                </div>
              </div>
            </article>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function TrackingPage() {
  const [modules, setModules] = useState<ApiSubject[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [rows, setRows] = useState<ApiStudentTrackingRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [history, setHistory] = useState<Array<{ id: string; previous_path: string; new_path: string; reason: string }>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [reason, setReason] = useState("Decisión manual docente documentada.");
  const [tableLoading, setTableLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<ApiStudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailModuleId, setDetailModuleId] = useState("");

  const selectedModule = modules.find((module) => module.id === selectedModuleId);
    useEffect(() => {
    api
      .teacherModules()
      .then(setModules)
      .catch(() => setModules([]));
  }, []);

  useEffect(() => {
    if (!selectedModuleId || !selectedModule) {
      setRows([]);
      setSelectedStudentId("");
      return;
    }

    setTableLoading(true);
    setHistory([]);
    setAlerts([]);
    api
      .moduleTracking(selectedModuleId)
      .then((items) => {
        setRows(items);
        setSelectedStudentId(items[0]?.student.id ?? "");
      })
      .catch(() => {
        setRows([]);
        setSelectedStudentId("");
      })
      .finally(() => setTableLoading(false));

    api.moduleAlerts(selectedModuleId).then(setAlerts).catch(() => setAlerts([]));
  }, [selectedModule, selectedModuleId]);

  useEffect(() => {
    if (!selectedStudentId || !selectedModuleId) {
      setHistory([]);
      return;
    }
    api.pathHistory(selectedModuleId, selectedStudentId).then(setHistory).catch(() => setHistory([]));
  }, [selectedModuleId, selectedStudentId]);

  const loadStudentDetail = async (studentId: string, moduleId: string) => {
    const module = modules.find((item) => item.id === moduleId);
    const row = rows.find((item) => item.student.id === studentId);
    if (!module || !row) return;
    setSelectedStudentId(studentId);
    setDetailModuleId(moduleId);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await api.studentDetail(moduleId, studentId));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openStudentDetail = async (studentId: string) => {
    if (!selectedModuleId) return;
    setDetailOpen(true);
    await loadStudentDetail(studentId, selectedModuleId);
  };

  const changeDetailModule = async (moduleId: string) => {
    if (!detail?.student.id) return;
    await loadStudentDetail(detail.student.id, moduleId);
  };

  const changeStudentPath = async (studentId: string, moduleId: string, newPath: "reinforcement" | "standard" | "extension") => {
    const row = rows.find((item) => item.student.id === studentId);
    const previousPath = detail?.context.current_path ?? row?.current_path ?? "standard";
    await api.changePath(moduleId, studentId, newPath, reason).catch(() => undefined);
    if (moduleId === selectedModuleId) {
      setRows((current) => current.map((item) => (item.student.id === studentId ? { ...item, current_path: newPath } : item)));
    }
    setHistory((current) => [{ id: String(Date.now()), previous_path: previousPath, new_path: newPath, reason }, ...current]);
    setDetail((current) =>
      current
        ? {
            ...current,
            context: { ...current.context, current_path: newPath },
            path_history: [{ id: String(Date.now()), previous_path: previousPath, new_path: newPath, reason, created_at: new Date().toISOString() }, ...current.path_history],
          }
        : current,
    );
  };

  const changeDetailPath = (newPath: "reinforcement" | "standard" | "extension") => {
    if (!detail?.student.id || !detailModuleId) return;
    void changeStudentPath(detail.student.id, detailModuleId, newPath);
  };

  const moduleOptions = useMemo(() => modules, [modules]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Alumnado y seguimiento</h1>
        <p className="mt-2 text-lg text-text-muted">Selecciona primero el modulo para cargar el alumnado matriculado y sus estadisticas.</p>
      </header>

      <section className="card p-5">
        <label className="block max-w-2xl">
          <span className="field-label">Modulo o asignatura</span>
          <select className="field" value={selectedModuleId} onChange={(event) => setSelectedModuleId(event.target.value)}>
            <option value="">Selecciona un modulo</option>
            {moduleOptions.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name} · {module.course}
              </option>
            ))}
          </select>
        </label>
      </section>

      {!selectedModuleId ? (
        <section className="card p-8 text-center">
          <Icon name="users" className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 text-xl font-bold">Selecciona un modulo para continuar</h2>
          <p className="mt-2 text-text-muted">La tabla se cargara con el alumnado matriculado en la asignatura elegida.</p>
        </section>
      ) : (
        <section>
          <div className="card overflow-hidden">
            <div className="border-b border-outline-soft p-5">
              <h2 className="section-title">Alumnado matriculado</h2>
              <p className="mt-1 text-text-muted">{selectedModule?.name}</p>
            </div>
            {tableLoading ? <LoadingState label="Cargando alumnado matriculado" /> : null}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-low text-text-muted">
                  <tr>
                    <th className="p-3">Alumno</th>
                    <th className="p-3">Modulo</th>
                    <th className="p-3">Itinerario</th>
                    <th className="p-3">Ultima actividad</th>
                    <th className="p-3">Materiales</th>
                    <th className="p-3">Preguntas</th>
                    <th className="p-3">Progreso</th>
                    <th className="p-3">Alertas</th>
                    <th className="p-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.student.id}
                      className={`border-t border-outline-soft hover:bg-primary/5 ${selectedStudentId === row.student.id ? "bg-primary/5" : ""}`}
                    >
                      <td className="p-3 font-bold">{row.student.name}</td>
                      <td className="min-w-56 p-3">{selectedModule?.name}</td>
                      <td className="p-3">{pathLabels[row.current_path]}</td>
                      <td className="p-3">{row.last_activity}</td>
                      <td className="p-3">{row.materials_consulted}</td>
                      <td className="p-3">{row.questions_count}</td>
                      <td className="min-w-40 p-3">
                        <ProgressBar value={row.progress_percent} label="Progreso" />
                      </td>
                      <td className="p-3">{row.alerts_count}</td>
                      <td className="p-3">
                        <button className="button-secondary whitespace-nowrap px-3 py-2 text-sm" type="button" onClick={() => openStudentDetail(row.student.id)}>
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {detailOpen ? (
        <StudentDetailModal
          detail={detail}
          loading={detailLoading}
          modules={moduleOptions}
          selectedModuleId={detailModuleId || selectedModuleId}
          pathChangeReason={reason}
          onModuleChange={changeDetailModule}
          onPathChange={changeDetailPath}
          onReasonChange={setReason}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </div>
  );
}
