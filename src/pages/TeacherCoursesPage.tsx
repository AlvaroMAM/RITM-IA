import { useEffect, useState } from "react";
import { api, type ApiSubject } from "../api/client";
import { CourseCard } from "../components/courses/CourseCard";
import { Icon } from "../components/ui/Icon";
import { LoadingState } from "../components/ui/LoadingState";
import type { Course } from "../types";
import { subjectToCourse } from "../utils/moduleDisplay";

export function TeacherCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    api
      .teacherModules()
      .then(async (subjects: ApiSubject[]) => {
        const rows = await Promise.all(
          subjects.map(async (subject, index) => {
            const [units, students] = await Promise.all([
              api.moduleUnits(subject.id).catch(() => []),
              api.moduleTracking(subject.id).catch(() => []),
            ]);
            return subjectToCourse(subject, units.length, students.length, index);
          }),
        );
        if (mounted) setCourses(rows);
      })
      .catch((loadError: Error) => {
        if (!mounted) return;
        setCourses([]);
        setError(loadError.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="page-title">Mis Asignaturas</h1>
          <p className="mt-2 text-lg text-text-muted">Módulos profesionales cargados desde el backend.</p>
        </div>
        <button className="button-secondary optional-chrome" type="button">
          <Icon name="upload" />
          Subir material
        </button>
      </header>

      {loading ? <LoadingState label="Cargando módulos docentes desde backend" /> : null}
      {error ? <p className="rounded-md border border-primary/20 bg-primary/10 p-4 font-bold text-primary">{error}</p> : null}

      <section className="grid gap-6 lg:grid-cols-3">
        {courses.map((course, index) => (
          <CourseCard key={course.id} course={course} primary={index === 0} />
        ))}
      </section>

      {!loading && !error && courses.length === 0 ? (
        <section className="card p-6 text-center">
          <Icon name="graduation" className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 text-xl font-bold">No hay módulos asignados</h2>
          <p className="mt-2 text-text-muted">El backend no ha devuelto módulos para este docente.</p>
        </section>
      ) : null}
    </div>
  );
}
