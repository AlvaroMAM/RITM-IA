import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ApiResource } from "../api/client";
import { Icon } from "../components/ui/Icon";
import { LoadingState } from "../components/ui/LoadingState";
import { useCurrentSession } from "../hooks/useCurrentSession";
import { useStudentProgress } from "../hooks/useStudentProgress";

const learningPathLabels = {
  reinforcement: "Refuerzo",
  standard: "Estándar",
  extension: "Ampliación",
} as const;

export function StudentDashboardPage() {
  const session = useCurrentSession();
  const studentId = session?.role === "student" ? session.user.id : "";
  const { error, loading, modulesWithProgress } = useStudentProgress();
  const [recentResources, setRecentResources] = useState<ApiResource[]>([]);
  const firstName = session?.user.name.split(" ")[0] ?? "Alumno";
  const recentModules = modulesWithProgress.slice(0, 3);
  const enrollmentText = useMemo(() => {
    const firstModule = modulesWithProgress[0];
    if (!firstModule) return "Matrícula cargada desde backend.";
    return `Matriculado en ${firstModule.year} de ${firstModule.cycle}.`;
  }, [modulesWithProgress]);

  useEffect(() => {
    let mounted = true;
    if (!studentId) {
      setRecentResources([]);
      return () => {
        mounted = false;
      };
    }
    api
      .studentResources(studentId, "published")
      .then((items) => {
        if (mounted) setRecentResources(items.slice(0, 3));
      })
      .catch(() => {
        if (mounted) setRecentResources([]);
      });
    return () => {
      mounted = false;
    };
  }, [studentId]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="page-title">Hola, {firstName}</h1>
        <p className="mt-2 text-lg text-text-muted">{enrollmentText}</p>
      </header>

      {loading ? <LoadingState label="Cargando matrícula y recursos desde backend" /> : null}
      {error ? <p className="rounded-md border border-primary/20 bg-primary/10 p-4 font-bold text-primary">{error}</p> : null}

      <section className="space-y-4">
        <div>
          <h2 className="section-title">Accesos rápidos</h2>
          <p className="mt-1 text-text-muted">Continúa por tus últimos módulos abiertos o accede a herramientas habituales.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {recentModules.length > 0 ? recentModules.map((module) => (
            <Link key={module.id} className="card flex min-h-40 flex-col p-5 hover:border-primary" to={`/alumno/modulos/${module.id}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name={module.id === "programacion" ? "book" : "folder"} />
              </span>
              <span className="mt-4 text-sm font-bold text-primary">Último acceso</span>
              <h3 className="mt-1 flex-1 font-bold">{module.title}</h3>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">
                Abrir módulo
                <Icon name="chevron" className="h-4 w-4" />
              </span>
            </Link>
          )) : (
            <article className="card flex min-h-40 flex-col justify-center p-5 xl:col-span-3">
              <h3 className="font-bold">Sin módulos disponibles</h3>
              <p className="mt-2 text-text-muted">No hay módulos publicados para esta matrícula en backend.</p>
            </article>
          )}
          <a className="card flex min-h-40 flex-col p-5 hover:border-primary" href={session?.user.email ? `mailto:${session.user.email}` : "#"}>
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/20 text-primary">
              <Icon name="mail" />
            </span>
            <span className="mt-4 text-sm font-bold text-primary">Herramienta</span>
            <h3 className="mt-1 flex-1 font-bold">Correo electrónico</h3>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">
              Abrir correo
              <Icon name="chevron" className="h-4 w-4" />
            </span>
          </a>
          <a className="card flex min-h-40 flex-col p-5 hover:border-primary" href="https://cloud.ritm-ia.local" target="_blank" rel="noreferrer">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/20 text-primary">
              <Icon name="cloud" />
            </span>
            <span className="mt-4 text-sm font-bold text-primary">Herramienta</span>
            <h3 className="mt-1 flex-1 font-bold">Almacenamiento en la nube</h3>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">
              Abrir nube
              <Icon name="chevron" className="h-4 w-4" />
            </span>
          </a>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-title">Recursos Recientes</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {recentResources.length > 0 ? recentResources.map((resource) => {
            const module = modulesWithProgress.find((item) => item.id === resource.subject_id);
            const resourcePath = learningPathLabels[resource.learning_path];
            const isOptional = Boolean(module?.learningPath && module.learningPath !== resourcePath);

            return (
              <article key={resource.id} className="card p-5 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="file" />
                </span>
                <h3 className="mt-4 font-bold">{resource.title}</h3>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <span className="chip">{resource.resource_type}</span>
                  <span className="chip">{resourcePath}</span>
                  {isOptional ? <span className="chip">Optativo</span> : null}
                </div>
                {isOptional ? <p className="mt-3 text-sm font-bold text-primary">No cuenta para el avance del curso.</p> : null}
              </article>
            );
          }) : (
            <article className="card p-5 md:col-span-3">
              <h3 className="font-bold">Sin recursos recientes</h3>
              <p className="mt-2 text-text-muted">Aún no hay recursos generados publicados para esta cuenta.</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
