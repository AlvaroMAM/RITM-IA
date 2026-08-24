import { Link } from "react-router-dom";
import type { Course } from "../../types";
import { Icon } from "../ui/Icon";
import { ProgressBar } from "../ui/ProgressBar";

const accents: Record<Course["accent"], string> = {
  green: "from-primary to-primary-strong",
  orange: "from-tertiary to-primary",
  blue: "from-secondary to-primary",
};

export function CourseCard({ course, primary = false }: { course: Course; primary?: boolean }) {
  return (
    <article className="card group flex min-h-[24rem] flex-col overflow-hidden transition hover:-translate-y-1 hover:border-primary">
      <div className={`relative h-36 bg-gradient-to-br ${accents[course.accent]}`}>
        <div className="absolute inset-0 decorative-surface opacity-20 [background-image:linear-gradient(135deg,transparent_25%,white_25%,white_26%,transparent_26%,transparent_50%,white_50%,white_51%,transparent_51%)] [background-size:28px_28px]" />
        <span className="absolute left-5 top-5 rounded-md bg-emerald-200 px-3 py-1 text-sm font-extrabold text-emerald-950">
          {course.badge}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-2xl font-bold leading-tight text-text">{course.title}</h2>
        <p className="mt-2 text-text-muted">
          Ciclo: {course.cycle}. Curso: {course.year}.
        </p>
        <div className="my-4 flex flex-wrap gap-2">
          <span className="chip">
            <Icon name="book" className="h-4 w-4" />
            {course.unitsCount} unidades
          </span>
          <span className="chip">
            <Icon name="users" className="h-4 w-4" />
            {course.studentsCount} alumnos
          </span>
        </div>
        <ProgressBar value={course.progress} label="Progreso del curso" />
        {primary && (
          <div className="mt-5 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="font-bold text-primary">Recomendacion IA</p>
            <p className="mt-1 text-text-muted">Generar una adaptacion para UT2 con tres itinerarios.</p>
          </div>
        )}
      </div>
      <Link className="flex min-h-14 items-center justify-between border-t border-outline-soft bg-surface-low px-5 font-bold text-primary" to={`/docente/asignaturas/${course.id}`}>
        Acceder al curso
        <Icon name="chevron" />
      </Link>
    </article>
  );
}
