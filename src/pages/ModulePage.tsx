import { Link, useParams } from "react-router-dom";
import { ErrorState } from "../components/ui/ErrorState";
import { Icon } from "../components/ui/Icon";
import { LoadingState } from "../components/ui/LoadingState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useStudentProgress } from "../hooks/useStudentProgress";

export function ModulePage() {
  const { moduloId } = useParams();
  const { error, loading, materialCompletion, modulesWithProgress, toggleMaterialCompletion } = useStudentProgress();

  const module = modulesWithProgress.find((item) => item.id === moduloId);

  if (!moduloId) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="page-title">Módulos</h1>
          <p className="mt-2 text-lg text-text-muted">Módulos cargados desde la matrícula registrada en backend.</p>
        </header>
        {loading ? <LoadingState label="Cargando módulos desde backend" /> : null}
        {error ? <p className="rounded-md border border-primary/20 bg-primary/10 p-4 font-bold text-primary">{error}</p> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modulesWithProgress.length > 0 ? modulesWithProgress.map((item) => (
            <article key={item.id} className="card flex min-h-[435px] flex-col p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name={item.id === "programacion" ? "book" : "folder"} />
                </span>
                <span className="chip">
                  {item.year} {item.cycle}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold">{item.title}</h2>
              <p className="mt-1 text-sm text-text-muted">Docente: {item.teacher}</p>
              <div className="mt-4">
                <ProgressBar value={item.progress} label="Avance del módulo" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.units.map((unit) => (
                  <span key={unit.id} className="chip">
                    {unit.code}
                  </span>
                ))}
              </div>
              <Link className="button-primary mt-auto w-full" to={`/alumno/modulos/${item.id}`}>
                Abrir módulo
              </Link>
            </article>
          )) : !loading ? (
            <article className="card p-5 md:col-span-2 xl:col-span-3">
              <h2 className="text-xl font-bold">No hay módulos disponibles</h2>
              <p className="mt-2 text-text-muted">No se han encontrado módulos publicados para esta matrícula.</p>
            </article>
          ) : null}
        </section>
      </div>
    );
  }

  if (!module && loading) {
    return <LoadingState label="Cargando módulo desde backend" />;
  }

  if (!module) {
    return <ErrorState title="Módulo no encontrado" body="El módulo solicitado no existe en la matrícula registrada." />;
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-text-muted" aria-label="Migas de pan">
        <Link className="hover:text-primary" to="/alumno/modulos">
          Módulos
        </Link>
        <Icon name="chevron" className="h-4 w-4" />
        <span className="text-text">{module.title}</span>
      </nav>

      <header className="card overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary-strong p-6 text-white">
          <span className="rounded-md bg-white/15 px-3 py-1 text-sm font-bold">
            {module.year} {module.cycle}
          </span>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{module.title}</h1>
          <p className="mt-2 text-white/85">Docente: {module.teacher}</p>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <ProgressBar value={module.progress} label="Avance del módulo" />
          <span className="chip">Itinerario activo: {module.learningPath ?? "Estándar"}</span>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="section-title">Unidades de trabajo</h2>
            <p className="mt-1 text-text-muted">
              Despliega cada unidad para consultar los materiales disponibles según tu itinerario de aprendizaje.
            </p>
          </div>
          <Link className="button-secondary" to={`/alumno/asistente?modulo=${module.id}`}>
            <Icon name="bot" />
            Asistente del módulo
          </Link>
        </div>

        <div className="space-y-3">
          {module.units.map((unit) => {
            const visibleMaterials = unit.materials ?? [];
            const requiredMaterials = visibleMaterials.filter((material) => !material.isOptional);
            const completedMaterials = requiredMaterials.filter((material) => materialCompletion[material.id]).length;

            return (
              <details key={unit.id} className="card p-5">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <span className="chip">{unit.code}</span>
                      <h3 className="mt-3 text-xl font-bold">{unit.title}</h3>
                      <p className="mt-1 text-sm font-bold text-text-muted">
                        {completedMaterials}/{requiredMaterials.length} materiales obligatorios completados
                      </p>
                    </div>
                    <div className="min-w-56">
                      <ProgressBar value={unit.progress} label="Avance" />
                    </div>
                  </div>
                </summary>

                <div className="mt-5 border-t border-outline-soft pt-5">
                  <div className="mb-5 grid gap-4 lg:grid-cols-2">
                    <section className="rounded-md border border-outline-soft bg-surface-low p-4">
                      <h4 className="font-bold text-primary">Resultado de aprendizaje</h4>
                      <p className="mt-2 text-text-muted">
                        {unit.learningOutcome || "Resultado de aprendizaje pendiente de completar por el docente."}
                      </p>
                    </section>
                    <section className="rounded-md border border-outline-soft bg-surface-low p-4">
                      <h4 className="font-bold text-primary">Criterios de evaluación</h4>
                      {unit.criteria && unit.criteria.length > 0 ? (
                        <ul className="mt-2 space-y-2 text-text-muted">
                          {unit.criteria.map((criterion) => (
                            <li key={criterion} className="flex gap-2">
                              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <span>{criterion}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-text-muted">Sin criterios publicados.</p>
                      )}
                    </section>
                    <section className="rounded-md border border-outline-soft bg-surface-low p-4 lg:col-span-2">
                      <h4 className="font-bold text-primary">Contenidos</h4>
                      {unit.contents && unit.contents.length > 0 ? (
                        <ul className="mt-3 grid gap-2 md:grid-cols-2">
                          {unit.contents.map((content) => (
                            <li key={content} className="rounded-md border border-outline-soft bg-surface px-3 py-2 font-bold">
                              {content}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-text-muted">Sin contenidos publicados.</p>
                      )}
                    </section>
                  </div>
                  <h4 className="font-bold text-primary">Materiales disponibles para {module.learningPath ?? "Estándar"}</h4>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {visibleMaterials.length > 0 ? visibleMaterials.map((material) => {
                      const isCompleted = !material.isPersonalStudyMaterial && Boolean(materialCompletion[material.id]);

                      return (
                        <article
                          key={material.id}
                          className={`rounded-md border p-4 ${
                            isCompleted
                              ? "border-primary bg-primary/5"
                              : "border-outline-soft bg-surface-low"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h5 className="font-bold">{material.name}</h5>
                              <p className="mt-1 text-sm text-text-muted">{material.description}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                              <span className="chip">{material.type}</span>
                              <span className="chip">{material.rhythm}</span>
                              {material.isPersonalStudyMaterial ? <span className="chip">Estudio personal</span> : null}
                              {material.isOptional ? <span className="chip">Optativo</span> : null}
                            </div>
                          </div>
                          {material.isPersonalStudyMaterial ? (
                            <p className="mt-3 rounded-md border border-primary/20 bg-primary/10 p-3 text-sm font-bold text-primary">
                              Material generado por ti para estudiar. No cuenta para el avance de la UT ni requiere entrega.
                            </p>
                          ) : material.isOptional ? (
                            <p className="mt-3 rounded-md border border-secondary/30 bg-secondary/10 p-3 text-sm font-bold text-primary">
                              Material de {material.rhythm.toLowerCase()} disponible como ampliación optativa. No cuenta para el avance del curso.
                            </p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <Link
                              className="button-primary px-3 py-2 text-sm"
                              to={`/alumno/materiales/${material.id}?modulo=${module.id}&unidad=${unit.id}`}
                            >
                              Consultar
                            </Link>

                            {material.isPersonalStudyMaterial ? null : (
                            <label className="inline-flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-outline-soft bg-surface px-3 py-2 font-bold text-text">
                              <input
                                checked={isCompleted}
                                className="h-5 w-5 accent-primary"
                                onChange={() => {
                                  void toggleMaterialCompletion(module.id, unit.id, material);
                                }}
                                type="checkbox"
                              />
                              <span>
                                {isCompleted
                                  ? material.isOptional
                                    ? "Completado optativo"
                                    : "Completado"
                                  : material.isOptional
                                    ? "Marcar completado optativo"
                                    : "Marcar completado"}
                                </span>
                            </label>
                            )}
                          </div>
                        </article>
                      );
                    }) : (
                      <p className="rounded-md bg-surface-low p-4 text-text-muted md:col-span-2">
                        No hay materiales publicados para tu itinerario en esta unidad.
                      </p>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
