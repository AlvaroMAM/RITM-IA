import { useEffect, useState } from "react";
import { api, type ApiIndicator, type ApiSubject } from "../api/client";
import { Icon } from "../components/ui/Icon";
import { LoadingState } from "../components/ui/LoadingState";

export function IndicatorsPage() {
  const [modules, setModules] = useState<ApiSubject[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [indicators, setIndicators] = useState<ApiIndicator[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    api
      .teacherModules()
      .then((items) => {
        if (!mounted) return;
        setModules(items);
        setSelectedModuleId(items[0]?.id ?? "");
      })
      .catch((loadError: Error) => {
        if (!mounted) return;
        setModules([]);
        setError(loadError.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedModuleId) {
      setIndicators([]);
      setMetrics({});
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError("");
    Promise.all([
      api.moduleIndicators(selectedModuleId),
      fetch(`/api/modules/${selectedModuleId}/metrics`).then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar las métricas del módulo.");
        return response.json() as Promise<Record<string, number>>;
      }),
    ])
      .then(([nextIndicators, nextMetrics]) => {
        if (!mounted) return;
        setIndicators(nextIndicators);
        setMetrics(nextMetrics);
      })
      .catch((loadError: Error) => {
        if (!mounted) return;
        setIndicators([]);
        setMetrics({});
        setError(loadError.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedModuleId]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Indicadores del proyecto</h1>
        <p className="mt-2 text-lg text-text-muted">Indicadores por módulo con umbrales iniciales configurables y evidencias disponibles.</p>
      </header>

      <section className="card p-5">
        <label className="block max-w-2xl">
          <span className="field-label">Módulo</span>
          <select className="field" value={selectedModuleId} onChange={(event) => setSelectedModuleId(event.target.value)}>
            {modules.length === 0 ? <option value="">Sin módulos cargados</option> : null}
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name} · {module.course}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading ? <LoadingState label="Cargando indicadores desde backend" /> : null}
      {error ? <p className="rounded-md border border-primary/20 bg-primary/10 p-4 font-bold text-primary">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Materiales consultados", metrics.materials_consulted ?? 0],
          ["Preguntas", metrics.questions ?? 0],
          ["Alertas abiertas", metrics.alerts_open ?? 0],
          ["Recursos publicados", metrics.resources_published ?? 0],
        ].map(([label, value]) => (
          <article key={label} className="card p-5">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-text-muted">{label}</p>
            <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
          </article>
        ))}
      </section>

      {!loading && indicators.length === 0 ? (
        <section className="card p-6 text-center">
          <Icon name="gauge" className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 text-xl font-bold">Sin indicadores registrados</h2>
          <p className="mt-2 text-text-muted">El backend no ha devuelto indicadores para el módulo seleccionado.</p>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {indicators.map((indicator) => (
          <article key={indicator.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="chip">{indicator.code}</span>
                <h2 className="mt-3 text-xl font-bold">{indicator.title}</h2>
              </div>
              <Icon name="gauge" className="text-primary" />
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-bold">Valor observado</dt>
                <dd className="text-text-muted">{indicator.observed_value}</dd>
              </div>
              <div>
                <dt className="font-bold">Periodo</dt>
                <dd className="text-text-muted">{indicator.period}</dd>
              </div>
              <div>
                <dt className="font-bold">Estado</dt>
                <dd className="text-text-muted">{indicator.status}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {indicator.evidence.map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-4 rounded-md bg-surface-low p-3 text-sm text-text-muted">{indicator.teacher_observation}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
