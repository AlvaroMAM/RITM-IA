import { useEffect, useMemo, useState } from "react";
import { api, type ApiResource, type ApiStudentContext, type ApiUser } from "../../api/client";
import { useCurrentSession } from "../../hooks/useCurrentSession";
import type { LearningPath, ResourceType, Unit } from "../../types";
import { Icon } from "../ui/Icon";
import { LoadingState } from "../ui/LoadingState";
import { LearningPathSelector } from "./LearningPathSelector";
import { ResourceTypeSelector } from "./ResourceTypeSelector";
import { GeneratedResourcePreview, type GeneratedResourceView } from "./GeneratedResourcePreview";

const pathToApi = {
  refuerzo: "reinforcement",
  estandar: "standard",
  ampliacion: "extension",
} as const;

const pathFromApi = {
  reinforcement: "refuerzo",
  standard: "estandar",
  extension: "ampliacion",
} as const;

const resourceTypeToApi = {
  explicacion: "explanation",
  ejercicio: "practical_activity",
  reto: "extension_challenge",
  resumen: "summary",
  audio: "audio",
  mapa_mental: "mind_map",
} as const;

function apiResourceToView(resource: ApiResource): GeneratedResourceView {
  const sections = resource.generated_content
    .split(/\n{2,}/)
    .map((block, index) => {
      const clean = block.replace(/^#+\s*/, "").trim();
      const [firstLine, ...rest] = clean.split("\n");
      return {
        heading: firstLine || `Bloque ${index + 1}`,
        body: rest.join(" ").trim() || clean,
      };
    })
    .filter((section) => section.body.length > 0)
    .slice(0, 4);

  const provider = String(resource.adaptations?.provider || "IA");
  const model = String(resource.adaptations?.model || "");
  const providerText =
    provider.toLowerCase() === "gemini"
      ? `Google Gemini (${model || "gemini-1.5-flash"})`
      : `Ollama local (${model || "gemma3:4b"})`;

  return {
    title: resource.title,
    summary: resource.summary,
    teacherNotes: `Generado por ${providerText} a través del servicio IA de RITM-IA y guardado con trazabilidad.`,
    sections: sections.length > 0 ? sections : [{ heading: "Contenido generado", body: resource.generated_content }],
    checklist: [
      `Proveedor IA: ${providerText}`,
      `Itinerario: ${resource.learning_path}`,
      `Tipo: ${resource.resource_type}`,
      "Estado persistido en base de datos",
    ],
    status: resource.status,
  };
}

export function GenerationForm({
  unit,
  moduleId,
  unitIds,
  baseMaterialIds,
}: {
  unit: Unit;
  moduleId?: string;
  unitIds?: string[];
  baseMaterialIds?: string[];
}) {
  const session = useCurrentSession();
  const teacherId = session?.role === "teacher" ? session.user.id : "";
  const [material, setMaterial] = useState(
    "Ejemplo base: pedir una nota por teclado, comprobar si es válida y mostrar si el alumno ha superado la actividad.",
  );
  const [instructions, setInstructions] = useState("Mantener ejemplos de consola y comprobar errores frecuentes.");
  const [targetMode, setTargetMode] = useState<"students" | "path">("students");
  const [students, setStudents] = useState<ApiUser[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentContext, setStudentContext] = useState<ApiStudentContext | null>(null);
  const [path, setPath] = useState<LearningPath>("refuerzo");
  const [type, setType] = useState<ResourceType>("ejercicio");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedResourceView | null>(null);
  const [apiResources, setApiResources] = useState<ApiResource[]>([]);
  const activeModuleId = moduleId ?? "";

  const activeStudentId = selectedStudents[0] ?? "";
  const activeStudent = useMemo(
    () => students.find((student) => student.id === activeStudentId),
    [activeStudentId, students],
  );

  useEffect(() => {
    let mounted = true;
    if (!activeModuleId) {
      setStudents([]);
      setSelectedStudents([]);
      return () => {
        mounted = false;
      };
    }
    api
      .students(activeModuleId)
      .then((items) => {
        if (!mounted) return;
        setStudents(items);
        if (items.length > 0) setSelectedStudents([items[0].id]);
      })
      .catch(() => {
        if (mounted) setStudents([]);
      });
    return () => {
      mounted = false;
    };
  }, [activeModuleId]);

  useEffect(() => {
    let mounted = true;
    if (!activeStudentId || !activeModuleId) {
      setStudentContext(null);
      return () => {
        mounted = false;
      };
    }
    api
      .studentContext(activeStudentId, activeModuleId)
      .then((context) => {
        if (!mounted) return;
        setStudentContext(context);
        setPath(pathFromApi[context.recommended_path]);
      })
      .catch(() => {
        if (mounted) setStudentContext(null);
      });
    return () => {
      mounted = false;
    };
  }, [activeStudentId, activeModuleId]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setStatus(null);
    setGenerated(null);
    setApiResources([]);
    try {
      if (moduleId && unitIds?.length && baseMaterialIds?.length) {
        if (!teacherId) {
          throw new Error("No hay una sesión de docente activa.");
        }
        const resource = await api.adaptiveGenerate({
          module_id: moduleId,
          unit_ids: unitIds,
          base_material_ids: baseMaterialIds,
          teacher_id: teacherId,
          learning_path: pathToApi[path],
          resource_type: resourceTypeToApi[type],
          audience_type: targetMode === "students" ? "student" : "pathway",
          student_ids: targetMode === "students" ? selectedStudents : [],
          teacher_instructions: instructions,
          title: undefined,
        });
        setApiResources([resource]);
        setGenerated(apiResourceToView(resource));
        setStatus("Recurso adaptativo generado por Ollama con trazabilidad de módulo, UT y materiales base.");
        return;
      }
      throw new Error("Selecciona módulo, unidades y materiales base cargados desde backend antes de generar.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo generar el recurso con el modelo local.");
    } finally {
      setLoading(false);
    }
  };

  const validateGenerated = async () => {
    if (apiResources.length === 0) {
      setStatus("No hay un material generado por el modelo para validar.");
      return;
    }
    try {
      const validatedResources = await Promise.all(
        apiResources.map((resource) =>
          resource.status === "generated" || resource.status === "reviewed"
            ? api.adaptiveValidate(resource.id, {
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
                notes: "Lista de cotejo DUA completada en el MVP.",
              })
            : api.validateResource(resource.id),
        ),
      );
      setApiResources(validatedResources);
      setGenerated(apiResourceToView(validatedResources[0]));
      setStatus("Material validado. Ya puede publicarse para el alumnado seleccionado.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo validar el recurso.");
    }
  };

  const publishGenerated = async () => {
    if (apiResources.length === 0) return;
    try {
      const publishedResources = await Promise.all(
        apiResources.map((resource) => (moduleId ? api.adaptivePublish(resource.id) : api.publishResource(resource.id))),
      );
      setApiResources(publishedResources);
      setGenerated(apiResourceToView(publishedResources[0]));
      setStatus("Material publicado para el alumnado seleccionado o el itinerario indicado.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo publicar el recurso.");
    }
  };

  const discardGenerated = async () => {
    if (apiResources.length > 0) {
      await Promise.all(apiResources.map((resource) => api.discardResource(resource.id).catch(() => undefined)));
    }
    setApiResources([]);
    setGenerated(null);
    setStatus("Resultado descartado.");
  };

  return (
    <div>
      <section className="card overflow-hidden">
        <div className="bg-primary p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15">
              <Icon name="sparkles" />
            </span>
            <div>
              <h2 className="text-2xl font-bold">Configuración de Generación IA</h2>
              <p className="text-white/85">Generación con modelo local Ollama para materiales adaptados.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 md:p-6">
          <label>
            <span className="field-label">Instrucciones adicionales</span>
            <textarea className="field min-h-40" value={instructions} onChange={(event) => setInstructions(event.target.value)} />
          </label>

          <fieldset>
            <legend className="field-label">Destinatarios</legend>
            <div className="mb-4 inline-flex rounded-lg bg-surface-low p-1">
              <button
                className={`min-h-11 rounded-md px-4 font-bold ${targetMode === "students" ? "bg-surface text-primary shadow-sm" : "text-text-muted"}`}
                type="button"
                onClick={() => setTargetMode("students")}
              >
                Alumnado concreto
              </button>
              <button
                className={`min-h-11 rounded-md px-4 font-bold ${targetMode === "path" ? "bg-surface text-primary shadow-sm" : "text-text-muted"}`}
                type="button"
                onClick={() => setTargetMode("path")}
              >
                Itinerario completo
              </button>
            </div>

            {targetMode === "students" ? (
              <div className="grid gap-3 rounded-lg border border-outline-soft p-4 md:grid-cols-3">
                {students.map((student) => (
                  <label key={student.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md bg-surface-low px-3">
                    <input checked={selectedStudents.includes(student.id)} type="checkbox" onChange={() => toggleStudent(student.id)} />
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-950">
                      {student.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <span className="font-bold">{student.name}</span>
                  </label>
                ))}
                {students.length === 0 ? (
                  <p className="rounded-md bg-surface-low p-3 text-sm text-text-muted md:col-span-3">
                    No hay alumnado devuelto por el backend para este módulo.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="rounded-md border border-outline-soft bg-surface-low p-4 text-text-muted">
                Se generará un recurso base para todo el itinerario seleccionado.
              </p>
            )}
            {activeStudent ? (
              <p className="mt-3 rounded-md bg-surface-low p-3 text-sm text-text-muted">
                Contexto activo: {activeStudent.name}. {studentContext ? `Itinerario recomendado: ${studentContext.recommended_path}.` : "Sin contexto cargado desde servidor."}
              </p>
            ) : null}
          </fieldset>

          <LearningPathSelector value={path} onChange={setPath} />
          <ResourceTypeSelector value={type} onChange={setType} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-soft pt-5">
            <button className="button-ghost" type="button" onClick={() => setStatus(null)}>
              Descartar cambios
            </button>
            <button
              className="button-primary"
              type="button"
              disabled={loading || !moduleId || !unitIds?.length || !baseMaterialIds?.length}
              onClick={handleGenerate}
            >
              <Icon name="sparkles" />
              Generar material adaptado
            </button>
          </div>

          {loading && <LoadingState label="Enviando contexto educativo a Ollama" />}
          {status && (
            <p className="rounded-md border border-primary/20 bg-primary/10 p-4 font-bold text-primary" role="status">
              {status}
            </p>
          )}
          {generated && (
            <GeneratedResourcePreview
              path={path}
              resource={generated}
              type={type}
              onDiscard={discardGenerated}
              onEdit={() => setStatus("Modo edición activado. Puedes ajustar las instrucciones y regenerar con Ollama.")}
              onRegenerate={handleGenerate}
              onValidate={validateGenerated}
              onPublish={apiResources[0]?.status === "validated" ? publishGenerated : undefined}
            />
          )}
        </div>
      </section>
    </div>
  );
}
