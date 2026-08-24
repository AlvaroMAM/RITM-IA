import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type ApiBaseMaterial, type ApiResource, type ApiSubject, type ApiUnit } from "../api/client";
import type { StudentModule } from "../types";
import { useCurrentSession } from "./useCurrentSession";

export type StudentMaterial = {
  id: string;
  name: string;
  type: string;
  kind: "base" | "adaptive";
  rhythm: "Refuerzo" | "Estándar" | "Ampliación";
  description: string;
  isOptional?: boolean;
  url?: string;
  generatedContent?: string;
  generatedBy?: string;
  isPersonalStudyMaterial?: boolean;
  audioUrl?: string;
};

type MaterialCompletion = Record<string, boolean>;

function calculateProgress(materials: StudentMaterial[], completion: MaterialCompletion) {
  const requiredMaterials = materials.filter((material) => !material.isOptional);

  if (requiredMaterials.length === 0) {
    return 0;
  }

  const completed = requiredMaterials.filter((material) => completion[material.id]).length;
  return Math.round((completed / requiredMaterials.length) * 100);
}

function cycleFromCourse(course: string): "ASIR" {
  void course;
  return "ASIR";
}

function yearFromCourse(course: string) {
  if (course.includes("1")) return "1º";
  if (course.includes("2")) return "2º";
  return course || "2.º";
}

const pathLabel = {
  reinforcement: "Refuerzo",
  standard: "Estándar",
  extension: "Ampliación",
} as const;

function materialFromBase(material: ApiBaseMaterial, rhythm: StudentMaterial["rhythm"]): StudentMaterial {
  return {
    id: material.id,
    name: material.title,
    type: material.material_type.toUpperCase(),
    kind: "base",
    rhythm,
    description: material.description,
    url: material.file_path ? api.baseMaterialDownloadUrl(material.subject_id, material.id) : material.url ?? undefined,
  };
}

function stringFromPath(value: unknown, path: string[]) {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return "";
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : "";
}

function audioUrlFromResource(resource: ApiResource) {
  return (
    stringFromPath(resource.adaptations, ["media_generation", "audio", "data_url"]) ||
    stringFromPath(resource.adaptations, ["media_generation", "audio", "url"]) ||
    stringFromPath(resource.adaptations, ["media_generation", "audio", "response", "data_url"]) ||
    stringFromPath(resource.adaptations, ["media_generation", "audio", "response", "url"])
  );
}

function materialFromResource(resource: ApiResource, currentRhythm: StudentMaterial["rhythm"]): StudentMaterial {
  const resourceRhythm = pathLabel[resource.learning_path];
  const isPersonalStudyMaterial = resource.generated_by === "student-ai-service";

  return {
    id: resource.id,
    name: resource.title,
    type: "Recurso Generado",
    kind: "adaptive",
    rhythm: resourceRhythm,
    description: resource.summary,
    isOptional: isPersonalStudyMaterial || resourceRhythm !== currentRhythm,
    generatedContent: resource.generated_content,
    generatedBy: resource.generated_by,
    isPersonalStudyMaterial,
    audioUrl: audioUrlFromResource(resource) || undefined,
  };
}

function moduleFromApi(subject: ApiSubject, units: ApiUnit[], materialsByUnit: Record<string, StudentMaterial[]>): StudentModule {
  return {
    id: subject.id,
    title: subject.name,
    cycle: cycleFromCourse(subject.course),
    year: yearFromCourse(subject.course),
    progress: 0,
    teacher: "Álvaro Manuel Aparicio Morales",
    units: units.map((unit) => ({
      id: unit.id,
      code: unit.code,
      title: unit.title,
      description: unit.description,
      learningOutcome: unit.learning_outcome,
      criteria: unit.evaluation_criteria,
      contents: unit.contents,
      progress: 0,
      materials: materialsByUnit[unit.id] ?? [],
    })),
  };
}

export function useStudentProgress() {
  const session = useCurrentSession();
  const studentId = session?.role === "student" ? session.user.id : "";
  const [materialCompletion, setMaterialCompletion] = useState<MaterialCompletion>({});
  const [backendModules, setBackendModules] = useState<StudentModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshCompletions = useCallback(async (moduleId?: string) => {
    if (!studentId) return;
    if (moduleId) {
      const completions = await api.studentMaterialCompletions(studentId, moduleId);
      setMaterialCompletion((current) => {
        const next = { ...current };
        completions.forEach((completion) => {
          next[completion.material_id] = completion.completed;
        });
        return next;
      });
      return;
    }

    const subjects = await api.studentModules(studentId);
    const completionsByModule = await Promise.all(subjects.map((subject) => api.studentMaterialCompletions(studentId, subject.id)));
    setMaterialCompletion(Object.fromEntries(
      completionsByModule.flatMap((completions) =>
        completions.map((completion) => [completion.material_id, completion.completed] as const),
      ),
    ));
  }, [studentId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    if (!studentId) {
      setBackendModules([]);
      setLoading(false);
      setError("No hay una sesión de alumno activa.");
      return () => {
        mounted = false;
      };
    }
    api
      .studentModules(studentId)
      .then(async (subjects) => {
        const modulePayloads = await Promise.all(
          subjects.map(async (subject) => {
            const [units, context, completions] = await Promise.all([
              api.studentModuleUnits(subject.id, studentId),
              api.studentContext(studentId, subject.id).catch(() => null),
              api.studentMaterialCompletions(studentId, subject.id),
            ]);
            const materialsByUnitEntries = await Promise.all(
              units.map(async (unit) => {
                const payload = await api.studentUnitMaterials(subject.id, unit.id, studentId);
                const rhythm = context ? pathLabel[context.current_path] : pathLabel[payload.current_path as keyof typeof pathLabel] ?? "Estándar";
                return [
                  unit.id,
                  [
                    ...payload.standard_materials.map((material) => materialFromBase(material, rhythm)),
                    ...payload.adaptive_resources.map((resource) => materialFromResource(resource, rhythm)),
                  ],
                ] as [string, StudentMaterial[]];
              }),
            );
            return {
              module: {
                ...moduleFromApi(subject, units, Object.fromEntries(materialsByUnitEntries)),
                learningPath: context ? pathLabel[context.current_path] : undefined,
              },
              completions,
            };
          }),
        );
        if (mounted) {
          setBackendModules(modulePayloads.map((payload) => payload.module));
          setMaterialCompletion(Object.fromEntries(
            modulePayloads.flatMap((payload) =>
              payload.completions.map((completion) => [completion.material_id, completion.completed] as const),
            ),
          ));
        }
      })
      .catch((loadError: Error) => {
        if (mounted) {
          setBackendModules([]);
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [studentId]);

  const modulesWithProgress = useMemo(
    () => {
      return backendModules.map((moduleItem) => {
        const unitsWithProgress = moduleItem.units.map((unit) => {
          const materials = unit.materials ?? [];

          return {
            ...unit,
            progress: calculateProgress(materials, materialCompletion),
          };
        });

        const progress =
          unitsWithProgress.length > 0
            ? Math.round(unitsWithProgress.reduce((total, unit) => total + unit.progress, 0) / unitsWithProgress.length)
            : 0;

        return {
          ...moduleItem,
          progress,
          units: unitsWithProgress,
        };
      });
    },
    [backendModules, materialCompletion],
  );

  const toggleMaterialCompletion = useCallback(async (moduleId: string, unitId: string, material: StudentMaterial) => {
    if (!studentId) {
      setError("No hay una sesiÃ³n de alumno activa.");
      return;
    }
    let nextCompleted = true;
    setMaterialCompletion((current) => ({
        ...current,
        [material.id]: (nextCompleted = !current[material.id]),
      }));
    try {
      await api.setStudentMaterialCompletion(moduleId, unitId, material.id, studentId, {
        material_kind: material.kind,
        completed: nextCompleted,
      });
      await refreshCompletions(moduleId);
    } catch (toggleError) {
      await refreshCompletions(moduleId).catch(() => {
        setMaterialCompletion((current) => ({
          ...current,
          [material.id]: !nextCompleted,
        }));
      });
      setError(toggleError instanceof Error ? toggleError.message : "No se ha podido actualizar el avance del material.");
    }
  }, [refreshCompletions, studentId]);

  return {
    materialCompletion,
    loading,
    error,
    modulesWithProgress,
    toggleMaterialCompletion,
  };
}
