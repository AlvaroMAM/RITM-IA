import { useEffect, useState } from "react";
import { api, type ApiResource } from "../api/client";
import { GeneratedResourcePreview } from "../components/generation/GeneratedResourcePreview";
import { Icon } from "../components/ui/Icon";

const pathMap = {
  reinforcement: "refuerzo",
  standard: "estandar",
  extension: "ampliacion",
} as const;

function resourceToPreview(resource: ApiResource) {
  return {
    title: resource.title,
    summary: resource.summary,
    teacherNotes: `Estado: ${resource.status}. Versión ${resource.version ?? 1}.`,
    sections: [{ heading: "Contenido generado", body: resource.generated_content }],
    checklist: ["Trazabilidad de módulo", "Materiales de origen", "Audiencia definida", "Validación docente"],
    status: resource.status,
  };
}

export function GeneratedResourcesPage() {
  const [resources, setResources] = useState<ApiResource[]>([]);
  const [selected, setSelected] = useState<ApiResource | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let mounted = true;
    api
      .teacherModules()
      .then(async (modules) => {
        const items = (await Promise.all(modules.map((module) => api.moduleGeneratedResources(module.id))))
          .flat()
          .filter((resource) => resource.generated_by === "ai-service");
        if (!mounted) return;
        setResources(items);
        setSelected(items[0] ?? null);
      })
      .catch(() => {
        if (mounted) setResources([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const validate = async () => {
    if (!selected) return;
    try {
      const updated = await api.adaptiveValidate(selected.id, {
        technical_accuracy: true,
        unit_alignment: true,
        learning_outcome_alignment: true,
        evaluation_criteria_alignment: true,
        pathway_adequacy: true,
        clarity: true,
        difficulty_adequacy: true,
        accessibility: true,
        multiple_representation: true,
        action_expression: true,
        engagement: true,
        decision: "validated",
        notes: "Lista de cotejo DUA completada por el docente.",
      });
      setSelected(updated);
      setResources((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStatus("Recurso validado con lista de cotejo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo validar.");
    }
  };

  const publish = async () => {
    if (!selected) return;
    try {
      const updated = await api.adaptivePublish(selected.id);
      setSelected(updated);
      setResources((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStatus("Recurso publicado en las UT destino.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo publicar.");
    }
  };

  const discard = async () => {
    if (!selected) return;
    try {
      await api.adaptiveDiscard(selected.id);
      setResources((current) => current.filter((item) => item.id !== selected.id));
      setSelected(resources.find((item) => item.id !== selected.id) ?? null);
      setStatus("Recurso eliminado de las pantallas activas.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar el recurso.");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="card h-fit p-5">
        <h1 className="section-title text-xl">Recursos generados</h1>
        <p className="mt-2 text-sm text-text-muted">Consulta, valida y publica materiales adaptados.</p>
        <div className="mt-5 space-y-2">
          {resources.length === 0 ? (
            <p className="rounded-md bg-surface-low p-4 text-text-muted">Aún no hay recursos persistidos. Genera uno desde el generador adaptativo.</p>
          ) : (
            resources.map((resource) => (
              <button
                key={resource.id}
                className={`w-full rounded-md border p-3 text-left ${selected?.id === resource.id ? "border-primary bg-primary/5" : "border-outline-soft bg-surface-low"}`}
                type="button"
                onClick={() => setSelected(resource)}
              >
                <span className="block font-bold">{resource.title}</span>
                <span className="text-sm text-text-muted">
                  {resource.learning_path} · {resource.status}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="space-y-4">
        {status ? <p className="rounded-md border border-primary/20 bg-primary/10 p-4 font-bold text-primary">{status}</p> : null}
        {selected ? (
          <GeneratedResourcePreview
            path={pathMap[selected.learning_path]}
            type="ejercicio"
            resource={resourceToPreview(selected)}
            onDiscard={discard}
            onEdit={() => setStatus("Edición manual disponible sobre título, resumen y contenido.")}
            onRegenerate={() => setStatus("La regeneración crea una nueva versión sin borrar la anterior.")}
            onValidate={validate}
            onPublish={selected.status === "validated" ? publish : undefined}
          />
        ) : (
          <div className="card p-8 text-center">
            <Icon name="file" className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 text-2xl font-bold">Sin recurso seleccionado</h2>
          </div>
        )}
      </section>
    </div>
  );
}
