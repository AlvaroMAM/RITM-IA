import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { api, type ApiBaseMaterial, type ApiExplanation, type ApiSubject, type ApiUnit } from "../api/client";
import { GenerationForm } from "../components/generation/GenerationForm";
import { ErrorState } from "../components/ui/ErrorState";
import { Icon } from "../components/ui/Icon";
import { LoadingState } from "../components/ui/LoadingState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { quickActions, type QuickAction } from "../constants/assistantActions";
import { useCurrentSession } from "../hooks/useCurrentSession";
import { useStudentProgress, type StudentMaterial } from "../hooks/useStudentProgress";
import type { Unit } from "../types";
import { cycleFromCourse, resolveModuleId, yearFromCourse } from "../utils/moduleDisplay";

type Message = {
  id: number | string;
  from: "assistant" | "student";
  text: string;
};

type SelectableUnit = {
  id: string;
  code: string;
  title: string;
  description?: string;
  learningOutcome?: string;
  criteria?: string[];
  contents?: string[];
  progress: number;
  materials?: readonly StudentMaterial[];
};

type SelectableModule = {
  id: string;
  title: string;
  cycle: string;
  year: string;
  progress: number;
  teacher: string;
  units: readonly SelectableUnit[];
};

const quickActionPrompts: Record<QuickAction, string> = {
  explain: "Explícamelo de otra forma usando el contexto de las unidades seleccionadas.",
  example: "Dame un ejemplo contextualizado sobre este contenido.",
  exercise: "Genera un ejercicio breve relacionado con estas unidades.",
  summary: "Resume el contenido principal de las unidades seleccionadas.",
  check: "Comprueba mi respuesta y dime qué debería revisar. Si falta mi respuesta, indícame qué necesitas que escriba.",
};

function selectableTeacherModuleFromApi(subject: ApiSubject, moduleUnits: ApiUnit[]): SelectableModule {
  return {
    id: subject.id,
    title: subject.name,
    cycle: cycleFromCourse(subject.course),
    year: yearFromCourse(subject.course),
    progress: 0,
    teacher: "Docente conectado",
    units: moduleUnits.map((unit) => ({
      id: unit.id,
      code: unit.code,
      title: unit.title,
      description: unit.description,
      learningOutcome: unit.learning_outcome,
      criteria: unit.evaluation_criteria,
      contents: unit.contents,
      progress: unit.status === "published" ? 100 : 0,
    })),
  };
}

function findModuleForUnit(unitId: string | undefined, modules: readonly SelectableModule[] = []) {
  if (!unitId) return undefined;
  return modules.find((module) => module.units.some((unit) => unit.id === unitId));
}

function generatorUnitFromSelection(selectedUnits: SelectableUnit[]): Unit {
  const firstUnit = selectedUnits[0];

  return {
    id: selectedUnits.map((unit) => unit.id).join("__") || "backend-selection",
    courseId: "backend",
    code: selectedUnits.map((unit) => unit.code).join(", ") || "UT",
    title: selectedUnits.map((unit) => unit.title).join(" + ") || "Unidades seleccionadas",
    description: selectedUnits.length > 1 ? "Conjunto de unidades seleccionado desde backend." : firstUnit?.description ?? "",
    learningOutcome: selectedUnits.map((unit) => unit.learningOutcome).filter(Boolean).join("\n") || "Resultado de aprendizaje cargado desde backend.",
    criteria: selectedUnits.flatMap((unit) => unit.criteria ?? []),
    progress: selectedUnits.length > 0 ? Math.round(selectedUnits.reduce((total, unit) => total + unit.progress, 0) / selectedUnits.length) : 0,
    lessons: selectedUnits.flatMap((unit) =>
      (unit.contents ?? []).map((content) => ({ id: `${unit.id}-${content}`, title: content, description: content, completed: false })),
    ),
    resources: [],
    activities: [],
  };
}

function previewForUnit(unit: SelectableUnit) {
  return {
    learningOutcomes: unit.learningOutcome ? [unit.learningOutcome] : ["Resultado de aprendizaje pendiente en backend."],
    contents: unit.contents?.length ? unit.contents : ["Sin contenidos registrados en backend."],
  };
}

function formatExplanationMessage(explanation: ApiExplanation) {
  return [
    explanation.title,
    explanation.summary,
    explanation.generated_content,
    explanation.worked_example ? `Ejemplo: ${explanation.worked_example}` : "",
    explanation.comprehension_question ? `Pregunta de comprobación: ${explanation.comprehension_question}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function introMessage(module: SelectableModule, selectedUnits: SelectableUnit[]): Message {
  return {
    id: "intro",
    from: "assistant",
    text: `Hola. Soy el asistente educativo de RITM-IA para ${module.title}. Responderé solo sobre las unidades seleccionadas: ${selectedUnits
      .map((unit) => `${unit.code} ${unit.title}`)
      .join(", ")}.`,
  };
}

function messagesFromHistory(items: ApiExplanation[]): Message[] {
  return items.flatMap((item) => [
    {
      id: `student-${item.id}`,
      from: "student" as const,
      text: item.question,
    },
    {
      id: `assistant-${item.id}`,
      from: "assistant" as const,
      text: formatExplanationMessage(item),
    },
  ]);
}

export function AssistantPage() {
  const { unidadId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const session = useCurrentSession();
  const studentId = session?.role === "student" ? session.user.id : "";
  const {
    error: studentModulesError,
    loading: studentModulesLoading,
    modulesWithProgress: studentModulesWithProgress,
  } = useStudentProgress();
  const requestedModuleId = searchParams.get("modulo") ?? "";
  const isTeacherView = location.pathname.startsWith("/docente");
  const isStudentView = location.pathname.startsWith("/alumno");
  const [teacherBackendModules, setTeacherBackendModules] = useState<SelectableModule[] | null>(null);
  const availableModules = isTeacherView ? teacherBackendModules ?? [] : studentModulesWithProgress;
  const contextualModule = findModuleForUnit(unidadId, availableModules);
  const contextualUnit = contextualModule?.units.find((unit) => unit.id === unidadId);
  const normalizedRequestedModuleId = resolveModuleId(requestedModuleId);
  const requestedModule = availableModules.find((module) => module.id === normalizedRequestedModuleId || module.id === requestedModuleId);

  const [selectedModuleId, setSelectedModuleId] = useState(contextualModule?.id ?? requestedModule?.id ?? "");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>(contextualUnit ? [contextualUnit.id] : []);
  const [showContextPicker, setShowContextPicker] = useState(!contextualUnit);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [history, setHistory] = useState<ApiExplanation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [baseMaterials, setBaseMaterials] = useState<ApiBaseMaterial[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [showModulePreview, setShowModulePreview] = useState(false);
  const [studentMaterialTitle, setStudentMaterialTitle] = useState("");
  const [studentMaterialPrompt, setStudentMaterialPrompt] = useState("");
  const [studentMaterialType, setStudentMaterialType] = useState("explanation");
  const [selectedStudyMaterialId, setSelectedStudyMaterialId] = useState("");
  const [generatingStudentMaterial, setGeneratingStudentMaterial] = useState(false);
  const [studentMaterialStatus, setStudentMaterialStatus] = useState("");

  useEffect(() => {
    if (!isTeacherView) {
      setTeacherBackendModules(null);
      return;
    }
    let mounted = true;
    api
      .teacherModules()
      .then(async (subjects) => {
        const modules = await Promise.all(
          subjects.map(async (subject) => selectableTeacherModuleFromApi(subject, await api.moduleUnits(subject.id))),
        );
        if (mounted) setTeacherBackendModules(modules);
      })
      .catch(() => {
        if (mounted) setTeacherBackendModules(null);
      });
    return () => {
      mounted = false;
    };
  }, [isTeacherView]);

  const selectedModule = useMemo(
    () => availableModules.find((module) => module.id === selectedModuleId),
    [availableModules, selectedModuleId],
  );
  const selectedUnits = useMemo(
    () => selectedModule?.units.filter((unit) => selectedUnitIds.includes(unit.id)) ?? [],
    [selectedModule, selectedUnitIds],
  );
  const contextReady = Boolean(selectedModule && selectedUnits.length > 0);
  const panelReady = contextReady && !showContextPicker;
  const contextTitle = selectedModule
    ? `${selectedModule.title} - ${selectedUnits.map((unit) => unit.code).join(", ")}`
    : "Sin contexto seleccionado";
  const generatorUnit = useMemo(() => generatorUnitFromSelection(selectedUnits), [selectedUnits]);
  const backendModuleId = resolveModuleId(selectedModuleId);
  const backendUnitIds = selectedUnitIds;
  const studentStudyMaterialSources = useMemo(
    () =>
      selectedUnits.flatMap((unit) =>
        (unit.materials ?? []).map((material) => ({
          ...material,
          unitId: unit.id,
          unitCode: unit.code,
        })),
      ),
    [selectedUnits],
  );
  const selectedStudyMaterialSource = studentStudyMaterialSources.find((material) => material.id === selectedStudyMaterialId);

  useEffect(() => {
    if (!isStudentView) {
      setSelectedStudyMaterialId("");
      return;
    }
    if (!studentStudyMaterialSources.length) {
      setSelectedStudyMaterialId("");
      return;
    }
    setSelectedStudyMaterialId((current) =>
      current && studentStudyMaterialSources.some((material) => material.id === current)
        ? current
        : studentStudyMaterialSources[0].id,
    );
  }, [isStudentView, studentStudyMaterialSources]);

  useEffect(() => {
    if (contextualModule) {
      setSelectedModuleId(contextualModule.id);
      setSelectedUnitIds(contextualUnit ? [contextualUnit.id] : []);
      setShowContextPicker(!contextualUnit);
      return;
    }

    if (requestedModule) {
      setSelectedModuleId(requestedModule.id);
      setSelectedUnitIds([]);
      setShowContextPicker(true);
    }
  }, [contextualModule?.id, contextualUnit?.id, requestedModule?.id]);

  useEffect(() => {
    if (!panelReady || !selectedModule || isTeacherView) {
      setMessages([]);
      return;
    }

    setMessages([
      {
        id: 1,
        from: "assistant",
        text: `Hola. Soy el asistente educativo de RITM-IA para ${selectedModule.title}. Responderé solo sobre las unidades seleccionadas: ${selectedUnits
          .map((unit) => `${unit.code} ${unit.title}`)
          .join(", ")}.`,
      },
    ]);
  }, [isTeacherView, panelReady, selectedModule, selectedUnits]);

  useEffect(() => {
    const backendUnits = selectedUnitIds;
    if (!panelReady || !isStudentView || backendUnits.length === 0 || !studentId) {
      setHistory([]);
      return;
    }

    let mounted = true;
    Promise.all(backendUnits.map((unitId) => api.explanationHistory(studentId, unitId).catch(() => [])))
      .then((items) => {
        if (!mounted) return;
        const merged = items
          .flat()
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setHistory(merged);
      })
      .catch(() => {
        if (mounted) setHistory([]);
      });

    return () => {
      mounted = false;
    };
  }, [isStudentView, panelReady, selectedUnitIds, studentId]);

  useEffect(() => {
    if (!panelReady || !isStudentView || !selectedModule || !studentId) return;
    const chronologicalHistory = [...history].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    setMessages([introMessage(selectedModule, selectedUnits), ...messagesFromHistory(chronologicalHistory)]);
  }, [history, isStudentView, panelReady, selectedModule, selectedUnits]);

  useEffect(() => {
    if (!isTeacherView || !panelReady || backendUnitIds.length === 0) {
      setBaseMaterials([]);
      setSelectedMaterialIds([]);
      return;
    }
    let mounted = true;
    api
      .baseMaterials(backendModuleId, backendUnitIds)
      .then((materials) => {
        if (!mounted) return;
        setBaseMaterials(materials);
        setSelectedMaterialIds(materials.filter((material) => material.status === "published").map((material) => material.id));
      })
      .catch(() => {
        if (mounted) {
          setBaseMaterials([]);
          setSelectedMaterialIds([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [backendModuleId, isTeacherView, panelReady, selectedUnitIds.join("|")]);

  if (isStudentView && studentModulesLoading) {
    return <LoadingState label="Cargando contexto del alumno desde backend" />;
  }

  if (isStudentView && studentModulesError) {
    return <ErrorState title="No se pudo cargar el contexto" body={studentModulesError} />;
  }

  if (unidadId && !contextualModule) {
    return <ErrorState title="Unidad no encontrada" body="El asistente necesita una unidad válida y publicada para responder." />;
  }

  const selectModule = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setSelectedUnitIds([]);
    setShowContextPicker(true);
  };

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((current) => (current.includes(unitId) ? current.filter((id) => id !== unitId) : [...current, unitId]));
  };

  const toggleMaterial = (materialId: string) => {
    setSelectedMaterialIds((current) => (current.includes(materialId) ? current.filter((id) => id !== materialId) : [...current, materialId]));
  };

  const continueWithContext = () => {
    if (contextReady) setShowContextPicker(false);
  };

  const addAssistantResponse = (text: string) => {
    setMessages((current) => [...current, { id: Date.now(), from: "assistant", text }]);
  };

  const formatExplanation = (explanation: ApiExplanation) =>
    [
      explanation.title,
      explanation.summary,
      explanation.generated_content,
      explanation.worked_example ? `Ejemplo: ${explanation.worked_example}` : "",
      explanation.comprehension_question ? `Pregunta de comprobación: ${explanation.comprehension_question}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

  const askModel = async (question: string, topic?: string) => {
    if (!panelReady || !isStudentView || !selectedModule) return;
    const backendUnits = selectedUnitIds;
    setMessages((current) => [...current, { id: Date.now(), from: "student", text: question }]);
    setAsking(true);
    try {
      const explanation = await api.studentAssistantChat(backendModuleId, backendUnits, question, topic, studentId);
      setHistory((current) => [explanation, ...current]);
      addAssistantResponse(formatExplanation(explanation));
    } catch (error) {
      addAssistantResponse(
        error instanceof Error
          ? `No he podido consultar el modelo local con este contexto: ${error.message}`
          : "No he podido consultar el modelo local con este contexto.",
      );
    } finally {
      setAsking(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (!panelReady || isTeacherView || asking) return;
    void askModel(quickActionPrompts[action], action);
  };

  const oldFormatExplanation = (explanation: ApiExplanation) =>
    `${explanation.title}\n\n${explanation.summary}\n\n${explanation.generated_content}\n\nEjemplo: ${explanation.worked_example}\n\nPregunta de comprobación: ${explanation.comprehension_question}`;

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || !panelReady || isTeacherView) return;
    setInput("");
    await askModel(trimmed);
    return;
  };

  const generateStudentMaterial = async () => {
    const prompt = studentMaterialPrompt.trim();
    if (!prompt || !panelReady || !isStudentView || backendUnitIds.length === 0 || !studentId) return;
    setGeneratingStudentMaterial(true);
    setStudentMaterialStatus("");
    try {
      const resource = await api.studentGenerateMaterial(
        backendModuleId,
        {
          unit_ids: backendUnitIds,
          resource_type: studentMaterialType,
          prompt,
          title: studentMaterialTitle.trim() || undefined,
          source_material_ids: selectedStudyMaterialId ? [selectedStudyMaterialId] : [],
        },
        studentId,
      );
      setStudentMaterialPrompt("");
      setStudentMaterialTitle("");
      setStudentMaterialStatus(`Material generado: ${resource.title}. Ya aparece en las UT seleccionadas.`);
      addAssistantResponse(`He generado el material "${resource.title}" y lo he asociado a ${selectedUnits.map((unit) => unit.code).join(", ")}.`);
    } catch (error) {
      setStudentMaterialStatus(
        error instanceof Error ? `No se pudo generar el material: ${error.message}` : "No se pudo generar el material.",
      );
    } finally {
      setGeneratingStudentMaterial(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <section
        className={`card flex flex-col overflow-hidden ${
          isTeacherView ? "h-[calc(100vh-3rem)] min-h-[760px]" : "h-[calc(200vh-6rem)] min-h-[1320px]"
        }`}
      >
        <header className="border-b border-outline-soft p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text">
                {isTeacherView ? "Generador de materiales" : "Asistente educativo"}
              </h1>
              <p className="mt-1 text-text-muted">
                {isTeacherView
                  ? "Selecciona módulo y unidades de trabajo para generar materiales adaptados."
                  : unidadId
                    ? "Contexto cargado desde la unidad"
                    : "Elige módulo y unidades antes de preguntar"}
              </p>
            </div>
            <span className="rounded-full border-2 border-primary px-4 py-2 text-sm font-bold text-primary">
              {isTeacherView ? "Refuerzo · Estándar · Ampliación" : "IA contextual del módulo"}
            </span>
          </div>
        </header>

        {showContextPicker || !contextReady ? (
          <section className="border-b border-outline-soft bg-surface p-5">
            <h2 className="font-bold text-primary">
              {isTeacherView ? "Contexto para generar materiales" : "Contexto de consulta"}
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
              <fieldset>
                <legend className="field-label">Módulo</legend>
                <div className="grid gap-3 md:grid-cols-2">
                  {availableModules.map((module) => (
                    <label
                      key={module.id}
                      className={`card cursor-pointer p-4 ${selectedModuleId === module.id ? "border-primary bg-primary/5" : ""}`}
                    >
                      <input
                        checked={selectedModuleId === module.id}
                        className="sr-only"
                        name="assistant-module"
                        type="radio"
                        onChange={() => selectModule(module.id)}
                      />
                      <span className="font-bold">{module.title}</span>
                      <span className="mt-1 block text-sm text-text-muted">
                        {module.year} ASIR - {module.teacher}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="field-label">Unidades de trabajo</legend>
                {selectedModule ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {selectedModule.units.map((unit) => (
                        <label
                          key={unit.id}
                          className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md border border-outline-soft bg-surface-low px-3"
                        >
                          <input
                            checked={selectedUnitIds.includes(unit.id)}
                            className="h-5 w-5 accent-primary"
                            type="checkbox"
                            onChange={() => toggleUnit(unit.id)}
                          />
                          <span>
                            <span className="block font-bold">
                              {unit.code}. {unit.title}
                            </span>
                            <span className="text-sm text-text-muted">{unit.progress}% completado</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <button className="button-primary w-full" type="button" disabled={!contextReady} onClick={continueWithContext}>
                      Continuar
                    </button>
                    <p className="text-sm text-text-muted">
                      Puedes seleccionar una o varias unidades antes de continuar.
                    </p>
                  </div>
                ) : (
                  <p className="rounded-md bg-surface-low p-4 text-text-muted">Selecciona primero un módulo.</p>
                )}
              </fieldset>
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-4 border-b border-outline-soft bg-surface p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-primary">Contexto activo</p>
              <p className="font-bold">{contextTitle}</p>
              {selectedModule ? (
                <div className="mt-3 max-w-2xl">
                  <ProgressBar value={selectedModule.progress} label="Avance del módulo" />
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {isTeacherView && selectedModule ? (
                <button className="button-secondary whitespace-nowrap" type="button" onClick={() => setShowModulePreview(true)}>
                  Previsualización del módulo
                </button>
              ) : null}
              <button className="button-secondary whitespace-nowrap" type="button" onClick={() => setShowContextPicker(true)}>
                Cambiar contexto
              </button>
            </div>
          </section>
        )}

        {panelReady ? (
          isTeacherView ? (
            <div className="flex-1 overflow-y-auto bg-background p-5">
              <div className="mb-5">
                <h2 className="section-title">Generador de materiales adaptados</h2>
                <p className="mt-1 text-text-muted">
                  Elige alumnado concreto o itinerario completo, selecciona el nivel de aprendizaje y genera el recurso para las unidades marcadas.
                </p>
              </div>
              <section className="mb-5 rounded-lg border border-outline-soft bg-surface p-5">
                <h3 className="font-bold text-primary">Materiales base de origen</h3>
                <p className="mt-1 text-sm text-text-muted">Selecciona uno o varios materiales asociados a las UT marcadas.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {baseMaterials.map((material) => (
                    <label key={material.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md border border-outline-soft bg-surface-low px-3">
                      <input
                        checked={selectedMaterialIds.includes(material.id)}
                        className="h-5 w-5 accent-primary"
                        type="checkbox"
                        onChange={() => toggleMaterial(material.id)}
                      />
                      <span>
                        <span className="block font-bold">{material.title}</span>
                        <span className="text-sm text-text-muted">
                          {material.material_type} · {material.status}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {selectedMaterialIds.length === 0 ? (
                  <p className="mt-3 rounded-md bg-secondary/10 p-3 text-sm font-bold text-primary" role="status">
                    Selecciona al menos un material base para generar.
                  </p>
                ) : null}
              </section>
              {selectedMaterialIds.length > 0 ? (
                <GenerationForm
                  unit={generatorUnit}
                  moduleId={backendModuleId}
                  unitIds={backendUnitIds}
                  baseMaterialIds={selectedMaterialIds}
                />
              ) : null}
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-background p-5" aria-live="polite">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`flex gap-3 ${message.from === "student" ? "justify-end" : "justify-start"}`}
                  >
                    {message.from === "assistant" && (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <Icon name="bot" className="h-5 w-5" />
                      </span>
                    )}
                    <p
                      className={`max-w-[min(1280px,96%)] whitespace-pre-line rounded-lg p-4 text-lg ${
                        message.from === "student" ? "bg-primary text-white" : "bg-surface-high text-text"
                      }`}
                    >
                      {message.text}
                    </p>
                  </article>
                ))}
              </div>

              <footer className="border-t border-outline-soft bg-surface p-4">
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      className="whitespace-nowrap rounded-full border border-outline-soft bg-surface-low px-4 py-2 text-sm font-bold text-text-muted hover:border-primary hover:text-primary"
                      type="button"
                      onClick={() => handleQuickAction(action.id)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <label className="flex-1">
                    <span className="sr-only">Pregunta sobre el contexto seleccionado</span>
                    <textarea
                      className="field min-h-14 resize-none"
                      placeholder="Pregunta sobre las unidades seleccionadas..."
                      rows={1}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          send();
                        }
                      }}
                    />
                  </label>
                  <button className="button-primary px-4" type="button" aria-label="Enviar pregunta" disabled={asking} onClick={send}>
                    <Icon name="send" />
                  </button>
                </div>
                {asking ? (
                  <p className="mt-3 rounded-md bg-surface-low p-3 text-center font-bold text-primary" role="status">
                    Preparando explicación contextualizada...
                  </p>
                ) : null}
                <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
                  Respuesta generada por el servicio IA de RITM-IA con contexto educativo. Revisa el material con tu docente.
                </p>
                <details className="mt-4 rounded-lg border border-outline-soft bg-surface-low p-4">
                  <summary className="cursor-pointer font-bold text-primary">Generar material de estudio</summary>
                  <div className="mt-4 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
                    <label>
                      <span className="field-label">Formato</span>
                      <select className="field" value={studentMaterialType} onChange={(event) => setStudentMaterialType(event.target.value)}>
                        <option value="explanation">Explicacion</option>
                        <option value="audio">Audio</option>
                        <option value="mind_map">Mapa mental</option>
                        <option value="image">Imagen</option>
                        <option value="summary">Resumen</option>
                        <option value="study_guide">Guia de estudio</option>
                      </select>
                    </label>
                    <label>
                      <span className="field-label">Nombre opcional</span>
                      <input
                        className="field"
                        placeholder="Ej. Mapa mental UT1 y UT2"
                        value={studentMaterialTitle}
                        onChange={(event) => setStudentMaterialTitle(event.target.value)}
                      />
                    </label>
                    <label className="lg:col-span-2">
                      <span className="field-label">Material de partida</span>
                      <select
                        className="field"
                        value={selectedStudyMaterialId}
                        onChange={(event) => setSelectedStudyMaterialId(event.target.value)}
                        disabled={studentStudyMaterialSources.length === 0}
                      >
                        {studentStudyMaterialSources.length === 0 ? (
                          <option value="">No hay materiales publicados en las UT seleccionadas</option>
                        ) : (
                          studentStudyMaterialSources.map((material) => (
                            <option key={`${material.unitId}-${material.id}`} value={material.id}>
                              {material.unitCode} - {material.name} ({material.type})
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    <label className="lg:col-span-2">
                      <span className="field-label">Que necesitas generar</span>
                      <textarea
                        className="field min-h-24"
                        placeholder="Describe el material que quieres crear para las unidades seleccionadas..."
                        value={studentMaterialPrompt}
                        onChange={(event) => setStudentMaterialPrompt(event.target.value)}
                      />
                    </label>
                    <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-text-muted">
                        Se asociara a {selectedUnits.map((unit) => unit.code).join(", ")} y se generara a partir de{" "}
                        {selectedStudyMaterialSource ? `${selectedStudyMaterialSource.unitCode} - ${selectedStudyMaterialSource.name}` : "un material publicado"}.
                      </p>
                      <button
                        className="button-primary whitespace-nowrap flex items-center gap-2"
                        type="button"
                        disabled={!studentMaterialPrompt.trim() || !selectedStudyMaterialId || generatingStudentMaterial}
                        onClick={generateStudentMaterial}
                      >
                        <Icon name={generatingStudentMaterial ? "refresh" : "sparkles"} className={generatingStudentMaterial ? "animate-spin" : ""} />
                        {generatingStudentMaterial ? "Generando contenido..." : "Generar material"}
                      </button>
                    </div>

                    {generatingStudentMaterial ? (
                      <div className="flex items-center gap-3 rounded-md bg-primary/10 border border-primary/20 p-4 text-sm text-primary lg:col-span-2 shadow-sm">
                        <Icon name="refresh" className="h-5 w-5 animate-spin shrink-0 text-primary" />
                        <div>
                          <p className="font-bold">✨ Generando material adaptado con IA DUA...</p>
                          <p className="text-xs text-text-muted mt-0.5">
                            Sintetizando el material base y estructurando el formato. Este proceso puede tardar entre 5 y 20 segundos.
                          </p>
                        </div>
                      </div>
                    ) : studentMaterialStatus ? (
                      <p
                        className={`rounded-md p-3 text-sm font-bold lg:col-span-2 ${
                          studentMaterialStatus.startsWith("No se pudo")
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-surface p-3 text-primary"
                        }`}
                        role="status"
                      >
                        {studentMaterialStatus}
                      </p>
                    ) : null}
                  </div>
                </details>
              </footer>
            </>
          )
        ) : (
          <div className="flex flex-1 items-center justify-center bg-background p-8">
            <div className="max-w-lg text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name={isTeacherView ? "sparkles" : "bot"} />
              </span>
              <h2 className="mt-4 text-2xl font-bold">
                {contextReady ? "Confirma la selección para continuar" : "Selecciona contexto para continuar"}
              </h2>
              <p className="mt-2 text-text-muted">
                {contextReady
                  ? isTeacherView
                    ? "Puedes marcar más unidades o pulsar Continuar para abrir el generador."
                    : "Puedes marcar más unidades o pulsar Continuar para abrir el asistente con ese contexto."
                  : isTeacherView
                    ? "Desde el panel lateral debes elegir el módulo y al menos una unidad de trabajo antes de generar materiales."
                    : "Desde el panel lateral debes elegir el módulo y al menos una unidad de trabajo antes de usar el asistente."}
              </p>
            </div>
          </div>
        )}
      </section>

      {false && selectedModule ? (
      <aside className="space-y-6">
        <section className="card p-5">
          <h2 className="section-title text-xl">Contexto activo</h2>
          <p className="mt-2 font-bold text-primary">{contextTitle}</p>
          {selectedModule ? (
            <div className="mt-4">
              <ProgressBar value={selectedModule?.progress ?? 0} label="Avance del módulo" />
            </div>
          ) : null}
        </section>

        <section className="card p-5">
          <h2 className="section-title text-xl">Unidades seleccionadas</h2>
          {selectedUnits.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedUnits.map((unit) => (
                <span key={unit.id} className="chip">
                  {unit.code}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-muted">Aún no hay unidades seleccionadas.</p>
          )}
        </section>

        <section className="card p-5">
            <h2 className="section-title text-xl">Vocabulario clave</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {["if", "elif", "else", "while", "for", "break", "continue"].map((term) => (
                <span key={term} className="chip">
                  {term}
                </span>
              ))}
            </div>
        </section>

        {isStudentView && history.length > 0 ? (
          <section className="card p-5">
            <h2 className="section-title text-xl">Historial de esta unidad</h2>
            <div className="mt-4 space-y-3">
              {history.slice(0, 3).map((item) => (
                <article key={item.id} className="rounded-md border border-outline-soft bg-surface-low p-3">
                  <p className="text-sm font-bold">{item.question}</p>
                  <p className="mt-1 text-sm text-text-muted">{item.title}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </aside>
      ) : null}

      {showModulePreview && selectedModule ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="module-preview-title">
          <article className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-outline-soft bg-surface p-6 shadow-lg">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.08em] text-primary">Previsualización del módulo</p>
                <h2 id="module-preview-title" className="mt-1 text-2xl font-bold">
                  {selectedModule.title}
                </h2>
                <p className="mt-2 text-text-muted">
                  {selectedModule.year} de {selectedModule.cycle} · {selectedModule.teacher}
                </p>
              </div>
              <button className="button-secondary" type="button" onClick={() => setShowModulePreview(false)}>
                Cerrar
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {selectedModule.units.map((unit) => {
                const preview = previewForUnit(unit);
                return (
                  <details key={unit.id} className="rounded-lg border border-outline-soft bg-surface-low p-4">
                    <summary className="cursor-pointer font-bold">
                      {unit.code}. {unit.title}
                    </summary>
                    <div className="mt-4 space-y-3">
                      <details className="rounded-md border border-outline-soft bg-surface p-3">
                        <summary className="cursor-pointer font-bold text-primary">RAs</summary>
                        <ul className="mt-3 space-y-2">
                          {preview.learningOutcomes.map((outcome) => (
                            <li key={outcome} className="text-text-muted">
                              {outcome}
                            </li>
                          ))}
                        </ul>
                      </details>
                      <details className="rounded-md border border-outline-soft bg-surface p-3">
                        <summary className="cursor-pointer font-bold text-primary">Contenido</summary>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-text-muted">
                          {preview.contents.map((content) => (
                            <li key={content}>{content}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </details>
                );
              })}
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}
