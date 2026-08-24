import type { ApiSubject } from "../api/client";
import type { Course } from "../types";

export const legacyModuleIds: Record<string, string> = {
  asgbd: "module-0377-asgbd",
  programacion: "module-an4699-programacion",
  proyecto: "module-0379-proyecto-intermodular",
};

export function resolveModuleId(value = "") {
  return legacyModuleIds[value] ?? value;
}

export function cycleFromCourse(course: string) {
  return course.toUpperCase().includes("ASIR") ? "ASIR" : course || "ASIR";
}

export function yearFromCourse(course: string) {
  if (course.includes("1")) return "1º";
  if (course.includes("2")) return "2º";
  return course || "2º";
}

export function subjectToCourse(subject: ApiSubject, unitsCount = 0, studentsCount = 0, index = 0): Course {
  const accents: Course["accent"][] = ["green", "orange", "blue"];

  return {
    id: subject.id,
    title: subject.name,
    cycle: cycleFromCourse(subject.course),
    year: subject.academic_year,
    unitsCount,
    studentsCount,
    progress: 0,
    badge: `${yearFromCourse(subject.course)} ${cycleFromCourse(subject.course)} · ${subject.academic_year}`,
    accent: accents[index % accents.length],
  };
}
