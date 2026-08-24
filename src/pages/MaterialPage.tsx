import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, type ApiStudentSubmission } from "../api/client";
import { ErrorState } from "../components/ui/ErrorState";
import { AudioPlayer } from "../components/ui/AudioPlayer";
import { Icon } from "../components/ui/Icon";
import { LoadingState } from "../components/ui/LoadingState";
import { useCurrentSession } from "../hooks/useCurrentSession";
import { useStudentProgress } from "../hooks/useStudentProgress";

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MaterialPage() {
  const { materialId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const session = useCurrentSession();
  const studentId = session?.role === "student" ? session.user.id : "";
  const requestedModuleId = searchParams.get("modulo") ?? "";
  const requestedUnitId = searchParams.get("unidad") ?? "";
  const { error, loading, modulesWithProgress } = useStudentProgress();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<ApiStudentSubmission | null>(null);
  const [status, setStatus] = useState("");

  const context = useMemo(() => {
    for (const module of modulesWithProgress) {
      if (requestedModuleId && module.id !== requestedModuleId) continue;
      for (const unit of module.units) {
        if (requestedUnitId && unit.id !== requestedUnitId) continue;
        const material = (unit.materials ?? []).find((item) => item.id === materialId);
        if (material) return { module, unit, material };
      }
    }

    for (const module of modulesWithProgress) {
      for (const unit of module.units) {
        const material = (unit.materials ?? []).find((item) => item.id === materialId);
        if (material) return { module, unit, material };
      }
    }
    return null;
  }, [materialId, modulesWithProgress, requestedModuleId, requestedUnitId]);

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
    setStatus("");
  };

  useEffect(() => {
    if (!context || !studentId) return undefined;

    let consultationId = "";
    const { module, unit, material } = context;

    api
      .startMaterialConsultation(material.id, {
        student_id: studentId,
        subject_id: module.id,
        learning_unit_id: unit.id,
        material_kind: material.kind,
      })
      .then((consultation) => {
        consultationId = consultation.id;
      })
      .catch(() => {
        consultationId = "";
      });

    return () => {
      if (consultationId) {
        api.finishMaterialConsultation(material.id, consultationId).catch(() => undefined);
      }
    };
  }, [context, studentId]);

  const submitResponse = async () => {
    if (!context || !selectedFile) return;
    if (!studentId) {
      setStatus("No hay una sesión de alumno activa para enviar la respuesta.");
      return;
    }
    setSubmitting(true);
    setStatus("");
    try {
      const nextSubmission = await api.uploadStudentSubmission(
        context.module.id,
        context.unit.id,
        context.material.id,
        studentId,
        selectedFile,
        notes,
      );
      setSubmission(nextSubmission);
      setSelectedFile(null);
      setNotes("");
      setStatus("Respuesta enviada correctamente. Tu docente ya puede consultarla en seguimiento.");
    } catch (uploadError) {
      setStatus(uploadError instanceof Error ? uploadError.message : "No se pudo enviar la respuesta.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Cargando material desde backend" />;
  if (error) return <ErrorState title="No se pudo cargar el material" body={error} />;
  if (!context) {
    return <ErrorState title="Material no encontrado" body="El material solicitado no está disponible para esta matrícula o unidad." />;
  }

  const { module, unit, material } = context;
  const isStudentStudyMaterial = material.generatedBy === "student-ai-service";
  const isAudioMaterial =
    material.type.toLowerCase().includes("audio") ||
    material.name.toLowerCase().includes("audio") ||
    material.name.toLowerCase().includes("podcast") ||
    material.description.toLowerCase().includes("audio");

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-text-muted" aria-label="Migas de pan">
        <Link className="hover:text-primary" to="/alumno/modulos">
          Módulos
        </Link>
        <Icon name="chevron" className="h-4 w-4" />
        <Link className="hover:text-primary" to={`/alumno/modulos/${module.id}`}>
          {module.title}
        </Link>
        <Icon name="chevron" className="h-4 w-4" />
        <span className="text-text">{material.name}</span>
      </nav>

      <header className="card p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="chip">{unit.code}</span>
            <h1 className="mt-3 text-3xl font-bold">{material.name}</h1>
            <p className="mt-2 text-text-muted">{module.title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="chip">{material.type}</span>
            <span className="chip">{material.rhythm}</span>
            {material.isOptional ? <span className="chip">Optativo</span> : null}
          </div>
        </div>
        {material.isOptional ? (
          <p className="mt-4 rounded-md border border-secondary/30 bg-secondary/10 p-3 font-bold text-primary">
            Este material es de {material.rhythm.toLowerCase()} y es optativo para tu itinerario. No cuenta para el avance del curso.
          </p>
        ) : null}
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="section-title">Enunciado del material</h2>
            <p className="mt-3 text-text-muted">{material.description || "Material publicado por el docente."}</p>
            {isAudioMaterial && material.generatedContent ? (
              <AudioPlayer title={`Audio: ${material.name}`} textToSpeak={material.generatedContent} audioUrl={material.audioUrl} />
            ) : material.generatedContent ? (
              <div className="mt-5 whitespace-pre-line rounded-md border border-outline-soft bg-surface-low p-5 leading-relaxed">
                {material.generatedContent}
              </div>
            ) : null}
            {material.url ? (
              <a className="button-primary mt-5 inline-flex" href={material.url} target="_blank" rel="noreferrer">
                <Icon name="file" />
                Descargar material
              </a>
            ) : null}
          </section>

          {isStudentStudyMaterial ? (
            <section className="card p-5">
              <h2 className="section-title">Material de estudio personal</h2>
              <p className="mt-2 text-text-muted">
                Este recurso lo has generado para estudiar la unidad. No requiere entrega de archivo ni correccion docente, aunque el profesorado puede verlo en tu seguimiento.
              </p>
            </section>
          ) : (
          <section className="card p-5">
            <h2 className="section-title">Subir respuesta</h2>
            <p className="mt-2 text-text-muted">
              Puedes entregar PDF, DOC/DOCX, TXT, PY, imágenes u otros archivos admitidos por la plataforma.
            </p>
            <div className="mt-5 grid gap-4">
              <label>
                <span className="field-label">Archivo de respuesta</span>
                <input
                  className="field"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.py,.png,.jpg,.jpeg,.md,.json,.html,.css,.js,.ts"
                  onChange={selectFile}
                />
              </label>
              <label>
                <span className="field-label">Comentario opcional</span>
                <textarea
                  className="field min-h-24"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Añade una nota para tu docente si lo necesitas."
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-muted">
                  {selectedFile ? `${selectedFile.name} · ${formatFileSize(selectedFile.size)}` : "Selecciona un archivo para enviar."}
                </p>
                <button className="button-primary" type="button" disabled={!selectedFile || submitting} onClick={submitResponse}>
                  <Icon name="upload" />
                  {submitting ? "Enviando..." : "Enviar respuesta"}
                </button>
              </div>
              {status ? (
                <p className="rounded-md border border-primary/20 bg-primary/10 p-3 font-bold text-primary" role="status">
                  {status}
                </p>
              ) : null}
              {submission ? (
                <p className="rounded-md bg-surface-low p-3 text-sm text-text-muted">
                  Última entrega: {submission.original_filename} · {formatFileSize(submission.file_size)}.
                </p>
              ) : null}
            </div>
          </section>
          )}
        </div>

        <aside className="card h-fit p-5 xl:sticky xl:top-24">
          <h2 className="font-bold text-primary">Ayuda contextual</h2>
          <p className="mt-2 text-text-muted">Pregunta al asistente sobre esta unidad si necesitas aclarar el enunciado.</p>
          <Link className="button-secondary mt-4 w-full" to={`/alumno/unidades/${unit.id}/asistente`}>
            <Icon name="bot" />
            Preguntar al asistente
          </Link>
        </aside>
      </section>
    </div>
  );
}
