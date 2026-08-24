import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ApiBaseMaterial, type ApiResource, type ApiSubject, type ApiUnit } from "../api/client";
import { ErrorState } from "../components/ui/ErrorState";
import { Icon } from "../components/ui/Icon";
import { LoadingState } from "../components/ui/LoadingState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { resolveModuleId, subjectToCourse } from "../utils/moduleDisplay";

const materialTypeLabels: Record<string, string> = {
  audio: "Audio",
  external_document_url: "Documento externo",
  image: "Imagen",
  pdf: "PDF",
  presentation: "Presentación",
  source_code: "Código",
  text: "Texto",
  video_url: "Vídeo",
  web_url: "Web",
};

const resourceStatusLabels: Record<ApiResource["status"], string> = {
  archived: "Archivado",
  discarded: "Descartado",
  draft: "Borrador",
  generated: "Generado",
  published: "Publicado",
  reviewed: "Revisado",
  validated: "Validado",
};

function materialTypeLabel(type: string) {
  return materialTypeLabels[type] ?? type.replace(/_/g, " ");
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TeacherCoursePage() {
  const { asignaturaId = "" } = useParams();
  const backendModuleId = resolveModuleId(asignaturaId);
  const [modules, setModules] = useState<ApiSubject[]>([]);
  const [backendUnits, setBackendUnits] = useState<ApiUnit[]>([]);
  const [materialsByUnit, setMaterialsByUnit] = useState<Record<string, ApiBaseMaterial[]>>({});
  const [generatedResourcesByUnit, setGeneratedResourcesByUnit] = useState<Record<string, ApiResource[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError("");
    setBackendUnits([]);
    setMaterialsByUnit({});
    setGeneratedResourcesByUnit({});

    async function loadModuleContent() {
      try {
        const subjects = await api.teacherModules();
        const current = subjects.find((subject) => subject.id === backendModuleId);
        if (!current) {
          throw new Error("No se ha encontrado el módulo seleccionado en el backend.");
        }

        const units = await api.moduleUnits(backendModuleId);
        const contentEntries = await Promise.all(
          units.map(async (unit) => {
            const [unitMaterials, unitGeneratedResources] = await Promise.all([
              api.baseMaterials(backendModuleId, [unit.id]),
              api.moduleGeneratedResources(backendModuleId, [unit.id]),
            ]);
            return [unit.id, unitMaterials, unitGeneratedResources] as const;
          }),
        );

        if (!mounted) return;
        setModules(subjects);
        setBackendUnits(units);
        setMaterialsByUnit(Object.fromEntries(contentEntries.map(([unitId, unitMaterials]) => [unitId, unitMaterials])));
        setGeneratedResourcesByUnit(
          Object.fromEntries(contentEntries.map(([unitId, , unitGeneratedResources]) => [unitId, unitGeneratedResources])),
        );
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "No se han podido cargar los contenidos del módulo.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadModuleContent();

    return () => {
      mounted = false;
    };
  }, [backendModuleId]);

  const currentModule = modules.find((subject) => subject.id === backendModuleId);
  const course = currentModule ? subjectToCourse(currentModule, backendUnits.length, 0, 0) : null;
  const sortedUnits = useMemo(
    () => [...backendUnits].sort((left, right) => left.unit_order - right.unit_order || left.code.localeCompare(right.code)),
    [backendUnits],
  );

  if (isLoading) {
    return <LoadingState label="Cargando módulo desde backend" />;
  }

  if (error || !currentModule || !course) {
    return <ErrorState title="Curso no encontrado" body={error || "El curso solicitado no existe en el backend."} />;
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-text-muted" aria-label="Migas de pan">
        <Link className="hover:text-primary" to="/docente/asignaturas">
          Mis Asignaturas
        </Link>
        <Icon name="chevron" className="h-4 w-4" />
        <span className="text-text">{currentModule.name}</span>
      </nav>

      <header className="card overflow-hidden">
        <div className="bg-gradient-to-br from-primary via-primary-strong to-tertiary p-6 text-white">
          <span className="rounded-md bg-white/15 px-3 py-1 text-sm font-bold">{course.badge}</span>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{currentModule.name}</h1>
          <p className="mt-2 max-w-3xl text-white/90">{currentModule.description || "Vista completa del módulo cargada desde backend."}</p>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <ProgressBar value={course.progress} label="Progreso del curso" />
          <Link className="button-primary whitespace-nowrap px-4" to={`/docente/generador?modulo=${backendModuleId}`}>
            <Icon name="sparkles" />
            Generador
          </Link>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="section-title flex items-center gap-2">
          <Icon name="book" className="text-primary" />
          Unidades de trabajo
        </h2>

        {sortedUnits.length === 0 ? (
          <div className="card p-5">
            <h3 className="text-xl font-bold">Todavía no hay unidades creadas</h3>
            <p className="mt-2 text-text-muted">Crea y publica unidades desde Gestión de contenidos para que aparezcan en esta vista.</p>
            <Link className="button-primary mt-4 inline-flex" to={`/docente/modulos/${backendModuleId}/contenidos`}>
              <Icon name="folder" />
              Ir a gestión de contenidos
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedUnits.map((unit) => {
              const unitMaterials = materialsByUnit[unit.id] ?? [];
              const unitGeneratedResources = generatedResourcesByUnit[unit.id] ?? [];

              return (
                <details key={unit.id} className="card p-5">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="chip">{unit.code}</span>
                          <span className="chip">{unit.status === "published" ? "Publicada" : "Borrador"}</span>
                        </div>
                        <h3 className="mt-3 text-xl font-bold">{unit.title}</h3>
                        <p className="mt-1 text-text-muted">{unit.description || "Sin descripción registrada."}</p>
                      </div>
                      <span className="inline-flex items-center gap-2 font-bold text-primary">
                        Ver contenidos
                        <Icon name="chevron" className="h-4 w-4" />
                      </span>
                    </div>
                  </summary>

                  <div className="mt-5 grid gap-4 border-t border-outline-soft pt-5 lg:grid-cols-2">
                    <section className="rounded-md border border-outline-soft bg-surface-low p-4">
                      <h4 className="font-bold text-primary">Resultado de aprendizaje</h4>
                      <p className="mt-2 text-text-muted">{unit.learning_outcome || "Sin resultado de aprendizaje registrado."}</p>
                    </section>

                    <section className="rounded-md border border-outline-soft bg-surface-low p-4">
                      <h4 className="font-bold text-primary">Criterios de evaluación</h4>
                      {unit.evaluation_criteria.length > 0 ? (
                        <ul className="mt-2 space-y-2 text-text-muted">
                          {unit.evaluation_criteria.map((criterion) => (
                            <li key={criterion} className="flex gap-2">
                              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <span>{criterion}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-text-muted">Sin criterios registrados.</p>
                      )}
                    </section>

                    <section className="rounded-md border border-outline-soft bg-surface-low p-4 lg:col-span-2">
                      <h4 className="font-bold text-primary">Contenidos</h4>
                      {unit.contents.length > 0 ? (
                        <ul className="mt-3 grid gap-2 md:grid-cols-2">
                          {unit.contents.map((content) => (
                            <li key={content} className="rounded-md border border-outline-soft bg-surface px-3 py-2 font-bold">
                              {content}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-text-muted">Sin contenidos registrados.</p>
                      )}
                    </section>

                    <section className="rounded-md border border-outline-soft bg-surface-low p-4 lg:col-span-2">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h4 className="font-bold text-primary">Materiales subidos</h4>
                          <p className="mt-1 text-sm text-text-muted">Materiales base asociados a esta unidad.</p>
                        </div>
                        <span className="chip">{unitMaterials.length} materiales</span>
                      </div>
                      {unitMaterials.length > 0 ? (
                        <div className="mt-4 overflow-x-auto rounded-lg border border-outline-soft bg-surface">
                          <table className="min-w-full divide-y divide-outline-soft text-left text-sm">
                            <thead className="bg-surface-low">
                              <tr>
                                <th className="p-3 font-bold">Nombre</th>
                                <th className="p-3 font-bold">Tipo</th>
                                <th className="p-3 font-bold">Estado</th>
                                <th className="p-3 font-bold">Archivo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-soft">
                              {unitMaterials.map((material) => (
                                <tr key={material.id} className="align-top">
                                  <td className="p-3">
                                    <span className="font-bold">{material.title}</span>
                                    {material.description ? <span className="mt-1 block text-text-muted">{material.description}</span> : null}
                                  </td>
                                  <td className="p-3">{materialTypeLabel(material.material_type)}</td>
                                  <td className="p-3">
                                    <span className="chip">{material.status === "published" ? "Publicado" : "Borrador"}</span>
                                  </td>
                                  <td className="p-3">
                                    {material.file_path ? (
                                      <a className="font-bold text-primary underline-offset-4 hover:underline" href={api.baseMaterialDownloadUrl(backendModuleId, material.id)} target="_blank" rel="noreferrer">
                                        {material.original_filename ?? "Descargar"}
                                        {formatFileSize(material.file_size) ? ` · ${formatFileSize(material.file_size)}` : ""}
                                      </a>
                                    ) : (
                                      <span className="text-text-muted">{material.original_filename ?? "Sin archivo"}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="mt-3 rounded-md bg-surface px-3 py-2 text-text-muted">No hay materiales subidos asociados a esta UT.</p>
                      )}
                    </section>

                    <section className="rounded-md border border-outline-soft bg-surface-low p-4 lg:col-span-2">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h4 className="font-bold text-primary">Recursos generados por IA</h4>
                          <p className="mt-1 text-sm text-text-muted">Materiales adaptados asociados a esta unidad desde el generador docente.</p>
                        </div>
                        <span className="chip">{unitGeneratedResources.length} recursos</span>
                      </div>
                      {unitGeneratedResources.length > 0 ? (
                        <div className="mt-4 overflow-x-auto rounded-lg border border-outline-soft bg-surface">
                          <table className="min-w-full divide-y divide-outline-soft text-left text-sm">
                            <thead className="bg-surface-low">
                              <tr>
                                <th className="p-3 font-bold">Nombre</th>
                                <th className="p-3 font-bold">Tipo</th>
                                <th className="p-3 font-bold">Ritmo</th>
                                <th className="p-3 font-bold">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-soft">
                              {unitGeneratedResources.map((resource) => (
                                <tr key={resource.id} className="align-top">
                                  <td className="p-3">
                                    <span className="font-bold">{resource.title}</span>
                                    <span className="mt-1 block text-text-muted">{resource.summary}</span>
                                  </td>
                                  <td className="p-3">{materialTypeLabel(resource.resource_type)}</td>
                                  <td className="p-3">
                                    <span className="chip">
                                      {resource.learning_path === "reinforcement"
                                        ? "Refuerzo"
                                        : resource.learning_path === "extension"
                                          ? "Ampliación"
                                          : "Estándar"}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <span className="chip">{resourceStatusLabels[resource.status]}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="mt-3 rounded-md bg-surface px-3 py-2 text-text-muted">No hay recursos generados asociados a esta UT.</p>
                      )}
                    </section>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
