import { Link, useLocation, useParams } from "react-router-dom";
import { ErrorState } from "../components/ui/ErrorState";
import { Icon } from "../components/ui/Icon";
import { LoadingState } from "../components/ui/LoadingState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useStudentProgress, type StudentMaterial } from "../hooks/useStudentProgress";

import { AudioPlayer } from "../components/ui/AudioPlayer";

function MaterialCard({ material }: { material: StudentMaterial }) {
  const isAudioType =
    material.type.toLowerCase().includes("audio") ||
    material.name.toLowerCase().includes("audio") ||
    material.name.toLowerCase().includes("podcast") ||
    material.description.toLowerCase().includes("audio");

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            {isAudioType ? "🎧 " : null}
            {material.name}
          </h3>
          <p className="mt-2 text-text-muted">{material.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <span className="chip">{material.type}</span>
          <span className="chip">{material.rhythm}</span>
          {material.isOptional ? <span className="chip">Optativo</span> : null}
        </div>
      </div>
      {material.isOptional ? (
        <p className="mt-4 rounded-md border border-secondary/30 bg-secondary/10 p-3 text-sm font-bold text-primary">
          Material de {material.rhythm.toLowerCase()} disponible como ampliación optativa. No cuenta para el avance del curso.
        </p>
      ) : null}
      {isAudioType && material.generatedContent ? (
        <AudioPlayer title={`Audio: ${material.name}`} textToSpeak={material.generatedContent} />
      ) : material.generatedContent ? (
        <div className="mt-4 rounded-md bg-surface-high p-4 text-sm leading-relaxed text-text-muted">
          <p className="line-clamp-6 whitespace-pre-line">{material.generatedContent}</p>
        </div>
      ) : null}
    </>
  );

  return (
    <article className="card p-5">
      {material.url ? (
        <a className="block focus-ring rounded-md" href={material.url} target="_blank" rel="noreferrer">
          {body}
        </a>
      ) : (
        body
      )}
    </article>
  );
}

export function UnitPage() {
  const { unidadId = "" } = useParams();
  const location = useLocation();
  const isTeacherView = location.pathname.startsWith("/docente");
  const { error, loading, modulesWithProgress } = useStudentProgress();

  const module = modulesWithProgress.find((item) => item.units.some((unit) => unit.id === unidadId));
  const unit = module?.units.find((item) => item.id === unidadId);
  const materials = unit?.materials ?? [];
  const baseMaterials = materials.filter((material) => material.type !== "Recurso Generado");
  const generatedMaterials = materials.filter((material) => material.type === "Recurso Generado");

  if (loading) {
    return <LoadingState label="Cargando unidad desde backend" />;
  }

  if (error) {
    return <ErrorState title="No se pudo cargar la unidad" body={error} />;
  }

  if (!module || !unit) {
    return <ErrorState title="Unidad no encontrada" body="La unidad solicitada no está publicada o no pertenece a tu matrícula." />;
  }

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
        <span className="text-text">{unit.code}</span>
      </nav>

      <section className="overflow-hidden rounded-lg border border-outline-soft bg-gradient-to-br from-primary via-primary-strong to-tertiary text-white shadow-soft">
        <div className="p-6">
          <span className="rounded-md bg-white/15 px-3 py-1 text-sm font-bold">{module.title}</span>
          <h1 className="mt-5 text-3xl font-bold md:text-4xl">
            {unit.code}. {unit.title}
          </h1>
          <p className="mt-3 max-w-3xl text-white/90">{unit.description || "Unidad publicada desde la gestión de contenidos."}</p>
        </div>
        <div className="border-t border-white/20 bg-surface p-5 text-text">
          <ProgressBar value={unit.progress} label="Progreso unidad" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="section-title">Resultado de aprendizaje</h2>
            <p className="mt-3 rounded-md bg-surface-low p-4 font-bold text-primary">
              {unit.learningOutcome || "Resultado de aprendizaje pendiente de completar por el docente."}
            </p>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="card p-5">
              <h2 className="section-title">Criterios de evaluación</h2>
              {unit.criteria && unit.criteria.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {unit.criteria.map((criterion) => (
                    <li key={criterion} className="flex gap-2 text-text-muted">
                      <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-primary" />
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-text-muted">Todavía no se han publicado criterios para esta UT.</p>
              )}
            </article>

            <article className="card p-5">
              <h2 className="section-title">Contenidos</h2>
              {unit.contents && unit.contents.length > 0 ? (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-text-muted">
                  {unit.contents.map((content) => (
                    <li key={content}>{content}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-text-muted">Todavía no se han publicado contenidos para esta UT.</p>
              )}
            </article>
          </section>

          <section className="space-y-4">
            <h2 className="section-title flex items-center gap-2">
              <Icon name="file" className="text-primary" />
              Materiales del profesor
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {baseMaterials.length > 0 ? (
                baseMaterials.map((material) => <MaterialCard key={material.id} material={material} />)
              ) : (
                <p className="rounded-md bg-surface-low p-4 text-text-muted md:col-span-2">
                  No hay materiales base publicados para esta unidad.
                </p>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="section-title flex items-center gap-2">
              <Icon name="sparkles" className="text-primary" />
              Recursos generados visibles
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {generatedMaterials.length > 0 ? (
                generatedMaterials.map((material) => <MaterialCard key={material.id} material={material} />)
              ) : (
                <p className="rounded-md bg-surface-low p-4 text-text-muted md:col-span-2">
                  Aún no hay recursos generados publicados para tu itinerario en esta unidad.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="card h-fit overflow-hidden xl:sticky xl:top-24">
          <div className="border-b border-outline-soft p-5">
            <h2 className="flex items-center gap-2 font-bold text-primary">
              <Icon name={isTeacherView ? "sparkles" : "bot"} />
              {isTeacherView ? "Generador contextual" : "Asistente contextual"}
            </h2>
          </div>
          <div className="space-y-4 p-5">
            <p className="rounded-lg bg-surface-high p-4">
              {isTeacherView
                ? `Genera materiales adaptados para ${unit.code}: ${unit.title}.`
                : `Puedes preguntar sobre ${unit.code}: ${unit.title} con el contexto cargado desde backend.`}
            </p>
            <Link
              className="button-primary w-full"
              to={isTeacherView ? `/docente/generador?modulo=${module.id}` : `/alumno/unidades/${unit.id}/asistente`}
            >
              {isTeacherView ? "Generar materiales" : "Preguntar al asistente"}
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
