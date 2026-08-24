import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ApiBaseMaterial, type ApiResource, type ApiSubject, type ApiUnit } from "../api/client";
import { Icon } from "../components/ui/Icon";
import { LoadingState } from "../components/ui/LoadingState";
import { useCurrentSession } from "../hooks/useCurrentSession";

type MaterialRhythm = "Refuerzo" | "Estándar" | "Ampliación";

const rhythmOrder: MaterialRhythm[] = ["Refuerzo", "Estándar", "Ampliación"];

const materialTypeLabels: Record<string, string> = {
  audio: "audio",
  external_document_url: "documento externo",
  image: "imagen",
  pdf: "pdf",
  presentation: "presentación",
  source_code: "código",
  text: "texto",
  video: "video",
  video_url: "video",
  web_url: "web",
};

function inferMaterialType(file: File) {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image";
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".mp3") || name.endsWith(".wav") || name.endsWith(".ogg") || name.endsWith(".m4a") || name.endsWith(".aac") || name.endsWith(".webm")) return "audio";
  return "text";
}

function materialRhythm(material: ApiBaseMaterial): MaterialRhythm {
  const tagText = material.tags.join(" ").toLowerCase();
  if (tagText.includes("refuerzo") || tagText.includes("reinforcement")) return "Refuerzo";
  if (tagText.includes("ampliacion") || tagText.includes("ampliación") || tagText.includes("extension")) return "Ampliación";
  return "Estándar";
}

function materialBelongsToUnit(material: ApiBaseMaterial, unit?: ApiUnit) {
  if (!unit) return false;
  const tags = material.tags.map((tag) => tag.toLowerCase());
  return tags.includes(unit.id.toLowerCase()) || tags.includes(unit.code.toLowerCase());
}

function materialTypeLabel(type: string) {
  return materialTypeLabels[type] ?? type.replace(/_/g, " ");
}

function emptyUnitDraft(order: number) {
  return {
    code: `UT${order}`,
    title: "",
    description: "",
    learning_outcome: "",
    evaluation_criteria: "",
    contents: "",
  };
}

export function ContentManagementPage() {
  const { moduleId } = useParams();
  const session = useCurrentSession();
  const teacherId = session?.role === "teacher" ? session.user.id : "";
  const selectedModuleId = moduleId ?? "";
  const [modules, setModules] = useState<ApiSubject[]>([]);
  const [units, setUnits] = useState<ApiUnit[]>([]);
  const [materials, setMaterials] = useState<ApiBaseMaterial[]>([]);
  const [generatedResources, setGeneratedResources] = useState<ApiResource[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<ApiBaseMaterial | null>(null);
  const [viewMaterial, setViewMaterial] = useState<ApiBaseMaterial | null>(null);
  const [viewGeneratedResource, setViewGeneratedResource] = useState<ApiResource | null>(null);
  const [draftUnit, setDraftUnit] = useState({
    code: "UT1",
    title: "",
    description: "",
    learning_outcome: "",
    evaluation_criteria: "",
    contents: "",
  });

  const currentModule = useMemo(
    () => modules.find((item) => item.id === selectedModuleId),
    [modules, selectedModuleId],
  );
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId);
  const isCreatingUnit = !selectedUnit;
  const selectedUnitMaterials = useMemo(
    () => materials.filter((material) => materialBelongsToUnit(material, selectedUnit)),
    [materials, selectedUnit],
  );
  const materialsByRhythm = useMemo(
    () =>
      rhythmOrder.map((rhythm) => ({
        rhythm,
        rows: selectedUnitMaterials.filter((material) => materialRhythm(material) === rhythm),
      })),
    [selectedUnitMaterials],
  );
  const selectedGeneratedResources = useMemo(
    () => generatedResources,
    [generatedResources],
  );

  useEffect(() => {
    api
      .teacherModules()
      .then(setModules)
      .catch((error) => {
        setModules([]);
        setStatus(error instanceof Error ? error.message : "No se pudieron cargar los modulos del backend.");
      });
  }, []);

  useEffect(() => {
    if (!selectedModuleId) return;
    setLoading(true);
    Promise.all([api.moduleUnits(selectedModuleId), api.baseMaterials(selectedModuleId), api.moduleGeneratedResources(selectedModuleId)])
      .then(([nextUnits, nextMaterials, nextGeneratedResources]) => {
        setUnits(nextUnits);
        setMaterials(nextMaterials);
        setGeneratedResources(nextGeneratedResources);
        const firstUnit = nextUnits[0];
        setSelectedUnitId(firstUnit?.id ?? "");
        if (firstUnit) {
          setDraftUnit({
            code: firstUnit.code,
            title: firstUnit.title,
            description: firstUnit.description,
            learning_outcome: firstUnit.learning_outcome,
            evaluation_criteria: firstUnit.evaluation_criteria.join("\n"),
            contents: firstUnit.contents.join("\n"),
          });
        } else {
          setDraftUnit(emptyUnitDraft(1));
        }
      })
      .catch((error) => {
        setUnits([]);
        setMaterials([]);
        setGeneratedResources([]);
        setSelectedUnitId("");
        setStatus(error instanceof Error ? error.message : "No se pudieron cargar las unidades del módulo.");
      })
      .finally(() => setLoading(false));
  }, [selectedModuleId]);

  useEffect(() => {
    if (!selectedModuleId || !selectedUnit) {
      setGeneratedResources([]);
      return;
    }
    let mounted = true;
    api
      .moduleGeneratedResources(selectedModuleId, [selectedUnit.id])
      .then((items) => {
        if (mounted) setGeneratedResources(items);
      })
      .catch(() => {
        if (mounted) setGeneratedResources([]);
      });
    return () => {
      mounted = false;
    };
  }, [selectedModuleId, selectedUnit?.id]);

  const startNewUnit = () => {
    const nextOrder = units.length + 1;
    setSelectedUnitId("");
    setPreviewMaterial(null);
    setViewMaterial(null);
    setDraftUnit(emptyUnitDraft(nextOrder));
    setStatus("Completa los campos y pulsa Guardar para crear la nueva unidad de trabajo.");
  };

  const saveUnit = async () => {
    if (!selectedModuleId) return;
    if (!teacherId) {
      setStatus("No hay una sesión de docente activa.");
      return;
    }
    setStatus("");
    if (!draftUnit.code.trim() || !draftUnit.title.trim()) {
      setStatus("Para guardar la unidad debes indicar al menos el código y el título.");
      return;
    }
    const payload = {
      code: draftUnit.code.trim(),
      title: draftUnit.title.trim(),
      description: draftUnit.description.trim(),
      learning_outcome: draftUnit.learning_outcome.trim(),
      evaluation_criteria: draftUnit.evaluation_criteria.split("\n").map((item) => item.trim()).filter(Boolean),
      contents: draftUnit.contents.split("\n").map((item) => item.trim()).filter(Boolean),
      unit_order: selectedUnit?.unit_order ?? units.length + 1,
      created_by: teacherId,
    };
    try {
      const saved = selectedUnit && selectedUnitId
        ? await api.patchUnit(selectedModuleId, selectedUnit.id, payload)
        : await api.createUnit(selectedModuleId, payload);
      setUnits((current) => [saved, ...current.filter((unit) => unit.id !== saved.id)].sort((a, b) => a.unit_order - b.unit_order));
      setSelectedUnitId(saved.id);
      setStatus(selectedUnit && selectedUnitId ? "Unidad actualizada como borrador." : "Unidad creada como borrador.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar la unidad.");
    }
  };

  const uploadStandardMaterial = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedModuleId) return;
    if (!teacherId) {
      setStatus("No hay una sesión de docente activa.");
      event.currentTarget.value = "";
      return;
    }
    if (!selectedUnit) {
      setStatus("Primero guarda o selecciona una unidad de trabajo antes de subir materiales.");
      event.currentTarget.value = "";
      return;
    }
    try {
      const created = await api.createBaseMaterial(selectedModuleId, {
        title: file.name,
        description: `Material subido por el profesor y asignado automaticamente al ritmo estandar de ${selectedUnit.code}.`,
        material_type: inferMaterialType(file),
        text_content: `Archivo subido por el profesor: ${file.name}.`,
        tags: [selectedUnit.id, selectedUnit.code, "standard", "profesor"],
        uploaded_by: teacherId,
      });
      const uploaded = await api.uploadBaseMaterialFile(selectedModuleId, created.id, file);
      await api.linkUnitMaterial(selectedModuleId, selectedUnit.id, uploaded.id);
      const published = await api.publishBaseMaterial(selectedModuleId, uploaded.id);
      setMaterials((current) => [published, ...current.filter((item) => item.id !== published.id)]);
      setStatus("Material subido, almacenado, publicado y asociado a la unidad seleccionada.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo subir el material al backend.");
    }
    event.currentTarget.value = "";
  };

  const deleteMaterial = async (material: ApiBaseMaterial) => {
    if (!selectedModuleId) return;
    try {
      await api.deleteBaseMaterial(selectedModuleId, material.id);
      setMaterials((current) => current.filter((item) => item.id !== material.id));
      setPreviewMaterial((current) => (current?.id === material.id ? null : current));
      setViewMaterial((current) => (current?.id === material.id ? null : current));
      setStatus("Material eliminado de la unidad seleccionada.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "El backend no confirmo el borrado del material.");
    }
  };

  const deleteSelectedUnit = async () => {
    if (!selectedModuleId || !selectedUnit) {
      setStatus("Selecciona una unidad de trabajo antes de eliminarla.");
      return;
    }
    if (!window.confirm(`¿Eliminar la unidad ${selectedUnit.code}. ${selectedUnit.title}? Dejará de aparecer en las pantallas activas.`)) {
      return;
    }
    try {
      await api.deleteUnit(selectedModuleId, selectedUnit.id);
      const remaining = units.filter((unit) => unit.id !== selectedUnit.id);
      setUnits(remaining);
      const nextUnit = remaining[0];
      setSelectedUnitId(nextUnit?.id ?? "");
      setDraftUnit(nextUnit ? {
        code: nextUnit.code,
        title: nextUnit.title,
        description: nextUnit.description,
        learning_outcome: nextUnit.learning_outcome,
        evaluation_criteria: nextUnit.evaluation_criteria.join("\n"),
        contents: nextUnit.contents.join("\n"),
      } : emptyUnitDraft(1));
      setMaterials((current) => current.filter((material) => !materialBelongsToUnit(material, selectedUnit)));
      setGeneratedResources([]);
      setStatus("Unidad eliminada de las pantallas activas del módulo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar la unidad.");
    }
  };

  const deleteGeneratedResource = async (resource: ApiResource) => {
    try {
      await api.adaptiveDiscard(resource.id);
      setGeneratedResources((current) => current.filter((item) => item.id !== resource.id));
      setViewGeneratedResource((current) => (current?.id === resource.id ? null : current));
      setStatus("Recurso generado eliminado de las pantallas activas.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar el recurso generado.");
    }
  };

  const publishSelected = async () => {
    if (!selectedModuleId) return;
    if (!selectedUnit) {
      setStatus("No hay ninguna unidad seleccionada. Guarda una unidad de trabajo antes de publicarla.");
      return;
    }
    try {
      const readiness = await api.unitReadiness(selectedModuleId, selectedUnit.id);
      if (readiness.missing.length > 0) {
        setStatus(`Faltan elementos para publicar: ${readiness.missing.join(", ")}.`);
        return;
      }
      const published = await api.publishUnit(selectedModuleId, selectedUnit.id);
      setUnits((current) => current.map((unit) => (unit.id === published.id ? published : unit)));
      setStatus("Unidad publicada para el alumnado matriculado.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo publicar.");
    }
  };

  if (!selectedModuleId) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="page-title">Gestion de contenidos</h1>
          <p className="mt-2 text-lg text-text-muted">Selecciona primero un modulo profesional. No se gestionan unidades de forma global.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <Link key={module.id} className="card p-5 hover:border-primary" to={`/docente/modulos/${module.id}/contenidos`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="graduation" />
              </span>
              <h2 className="mt-4 text-xl font-bold">{module.name}</h2>
              <p className="mt-1 text-text-muted">
                {module.course} · {module.academic_year}
              </p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-primary">Modulo actual</p>
            <h1 className="mt-1 text-2xl font-bold">{currentModule?.name}</h1>
            <p className="text-text-muted">
              {currentModule?.course} · {currentModule?.academic_year}
            </p>
          </div>
          <Link className="button-secondary" to="/docente/contenidos">
            Cambiar modulo
          </Link>
        </div>
      </header>

      {loading ? <LoadingState label="Cargando contenidos del modulo" /> : null}
      {status ? <p className="rounded-md border border-primary/20 bg-primary/10 p-4 font-bold text-primary">{status}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title text-xl">Unidades de trabajo</h2>
              <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={startNewUnit}>
                <Icon name="plus" />
                Crear
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {isCreatingUnit ? (
                <div className="rounded-md border border-primary bg-primary/5 p-3">
                  <span className="block font-bold">Nueva unidad de trabajo</span>
                  <span className="text-sm text-text-muted">Pendiente de guardar</span>
                </div>
              ) : null}
              {units.length === 0 && !isCreatingUnit ? (
                <p className="rounded-md bg-surface-low p-3 text-sm text-text-muted">
                  Aún no hay unidades creadas en este módulo. Pulsa Crear para añadir la primera.
                </p>
              ) : null}
              {units.map((unit) => (
                <button
                  key={unit.id}
                  className={`w-full rounded-md border p-3 text-left ${selectedUnitId === unit.id ? "border-primary bg-primary/5" : "border-outline-soft bg-surface-low"}`}
                  type="button"
                  onClick={() => {
                    setSelectedUnitId(unit.id);
                    setPreviewMaterial(null);
                    setViewMaterial(null);
                    setDraftUnit({
                      code: unit.code,
                      title: unit.title,
                      description: unit.description,
                      learning_outcome: unit.learning_outcome,
                      evaluation_criteria: unit.evaluation_criteria.join("\n"),
                      contents: unit.contents.join("\n"),
                    });
                  }}
                >
                  <span className="block font-bold">
                    {unit.code}. {unit.title}
                  </span>
                  <span className="text-sm text-text-muted">{unit.status === "published" ? "Publicada" : "Borrador"}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="card p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="section-title">{isCreatingUnit ? "Crear unidad" : "Editor de unidad"}</h2>
              <p className="mt-1 text-text-muted">
                {isCreatingUnit
                  ? "Completa la nueva unidad y guárdala antes de añadir materiales o publicarla."
                  : "Los cambios quedan vinculados al módulo seleccionado."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="button-secondary" type="button" onClick={deleteSelectedUnit} disabled={isCreatingUnit}>
                <Icon name="trash" />
                Eliminar UT
              </button>
              <button className="button-primary" type="button" onClick={publishSelected} disabled={isCreatingUnit}>
                Publicar UT
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              <span className="field-label">Codigo</span>
              <input className="field" value={draftUnit.code} onChange={(event) => setDraftUnit((current) => ({ ...current, code: event.target.value }))} />
            </label>
            <label>
              <span className="field-label">Titulo</span>
              <input className="field" value={draftUnit.title} onChange={(event) => setDraftUnit((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="md:col-span-2">
              <span className="field-label">Descripcion</span>
              <textarea className="field min-h-24" value={draftUnit.description} onChange={(event) => setDraftUnit((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label className="md:col-span-2">
              <span className="field-label">Resultado de aprendizaje</span>
              <textarea className="field min-h-20" value={draftUnit.learning_outcome} onChange={(event) => setDraftUnit((current) => ({ ...current, learning_outcome: event.target.value }))} />
            </label>
            <label>
              <span className="field-label">Criterios de evaluacion</span>
              <textarea className="field min-h-32" value={draftUnit.evaluation_criteria} onChange={(event) => setDraftUnit((current) => ({ ...current, evaluation_criteria: event.target.value }))} />
            </label>
            <label>
              <span className="field-label">Contenidos</span>
              <textarea className="field min-h-32" value={draftUnit.contents} onChange={(event) => setDraftUnit((current) => ({ ...current, contents: event.target.value }))} />
            </label>
            <label className="md:col-span-2">
              <span className="field-label">Subir material estándar</span>
              <input
                className="field cursor-pointer file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:font-bold file:text-white"
                type="file"
                accept=".pdf,.txt,.png,.jpg,.jpeg,.mp3,.wav,.ogg,.m4a,.aac,.webm,application/pdf,text/plain,image/png,image/jpeg,audio/*"
                disabled={isCreatingUnit}
                onChange={uploadStandardMaterial}
              />
              <span className="mt-2 block text-sm text-text-muted">
                Admite PDF, TXT, imagen PNG/JPG y audio. El material subido por el profesor se registra automaticamente con ritmo Estándar en la UT seleccionada.
              </span>
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-3 border-t border-outline-soft pt-5">
            <button className="button-secondary" type="button" onClick={saveUnit}>
              {isCreatingUnit ? "Crear unidad" : "Guardar cambios"}
            </button>
          </div>

          <section className="mt-6 border-t border-outline-soft pt-6" aria-labelledby="unit-materials-title">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 id="unit-materials-title" className="section-title">
                  Materiales de la unidad
                </h2>
                <p className="mt-1 text-text-muted">
                  {selectedUnit
                    ? `Materiales asociados a ${selectedUnit.code}. ${selectedUnit.title}.`
                    : "Selecciona una unidad para consultar sus materiales."}
                </p>
              </div>
              <span className="chip">{selectedUnitMaterials.length} materiales</span>
            </div>

            {previewMaterial ? (
              <article className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-4" aria-live="polite">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.08em] text-primary">Previsualización</p>
                    <h3 className="mt-1 text-xl font-bold">{previewMaterial.title}</h3>
                    <p className="mt-2 text-text-muted">{previewMaterial.description}</p>
                    <p className="mt-2 text-sm">
                      Tipo: <strong>{materialTypeLabel(previewMaterial.material_type)}</strong> · Ritmo:{" "}
                      <strong>{materialRhythm(previewMaterial)}</strong>
                    </p>
                  </div>
                  <button className="button-secondary" type="button" onClick={() => setPreviewMaterial(null)}>
                    Cerrar
                  </button>
                </div>
              </article>
            ) : null}

            <div className="mt-4 overflow-x-auto rounded-lg border border-outline-soft">
              <table className="min-w-full divide-y divide-outline-soft text-left">
                <thead className="bg-surface-low">
                  <tr>
                    <th className="p-3 font-bold">Nombre</th>
                    <th className="p-3 font-bold">Tipo</th>
                    <th className="p-3 font-bold">Ritmo</th>
                    <th className="p-3 font-bold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-soft">
                  {materialsByRhythm.map(({ rhythm, rows }) => (
                    rows.length > 0 ? (
                      rows.map((material) => (
                        <tr key={material.id} className="align-top">
                          <td className="p-3">
                            <span className="font-bold">{material.title}</span>
                            <span className="mt-1 block text-sm text-text-muted">{material.status === "published" ? "Publicado" : "Borrador"}</span>
                          </td>
                          <td className="p-3">{materialTypeLabel(material.material_type)}</td>
                          <td className="p-3">
                            <span className="chip">{rhythm}</span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => setPreviewMaterial(material)}>
                                Previsualizar
                              </button>
                              <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => setViewMaterial(material)}>
                                Visualizar
                              </button>
                              <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => void deleteMaterial(material)}>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr key={rhythm}>
                        <td className="p-3 text-text-muted" colSpan={4}>
                          Sin materiales de ritmo {rhythm} en esta unidad.
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 border-t border-outline-soft pt-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="section-title">Recursos generados por IA</h2>
                  <p className="mt-1 text-text-muted">Recursos alternativos creados desde el generador para esta unidad.</p>
                </div>
                <span className="chip">{selectedGeneratedResources.length} recursos</span>
              </div>
              <div className="mt-4 overflow-x-auto rounded-lg border border-outline-soft">
                <table className="min-w-full divide-y divide-outline-soft text-left">
                  <thead className="bg-surface-low">
                    <tr>
                      <th className="p-3 font-bold">Nombre</th>
                      <th className="p-3 font-bold">Tipo</th>
                      <th className="p-3 font-bold">Ritmo</th>
                      <th className="p-3 font-bold">Estado</th>
                      <th className="p-3 font-bold">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-soft">
                    {selectedGeneratedResources.length > 0 ? (
                      selectedGeneratedResources.map((resource) => (
                        <tr key={resource.id} className="align-top">
                          <td className="p-3">
                            <span className="font-bold">{resource.title}</span>
                            <span className="mt-1 block text-sm text-text-muted">{resource.summary}</span>
                          </td>
                          <td className="p-3">{resource.resource_type}</td>
                          <td className="p-3">
                            <span className="chip">{resource.learning_path}</span>
                          </td>
                          <td className="p-3">
                            <span className="chip">{resource.status === "published" ? "Publicado" : resource.status}</span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => setViewGeneratedResource(resource)}>
                                Visualizar
                              </button>
                              <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => void deleteGeneratedResource(resource)}>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 text-text-muted" colSpan={5}>
                          No hay recursos generados asociados a esta unidad.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </section>
      </section>

      {viewGeneratedResource ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="generated-resource-view-title">
          <article className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-outline-soft bg-surface p-6 shadow-lg">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.08em] text-primary">Recurso generado por IA</p>
                <h2 id="generated-resource-view-title" className="mt-1 text-2xl font-bold">
                  {viewGeneratedResource.title}
                </h2>
                <p className="mt-2 text-text-muted">{viewGeneratedResource.summary}</p>
              </div>
              <button className="button-secondary" type="button" onClick={() => setViewGeneratedResource(null)}>
                Cerrar
              </button>
            </div>
            <dl className="mt-5 grid gap-3 rounded-lg bg-surface-low p-4 md:grid-cols-3">
              <div>
                <dt className="text-sm font-bold text-text-muted">Tipo</dt>
                <dd>{viewGeneratedResource.resource_type}</dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-text-muted">Ritmo</dt>
                <dd>{viewGeneratedResource.learning_path}</dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-text-muted">Estado</dt>
                <dd>{viewGeneratedResource.status}</dd>
              </div>
            </dl>
            <div className="mt-5 rounded-lg border border-outline-soft bg-surface-low p-4">
              <h3 className="font-bold">Contenido generado</h3>
              <p className="mt-2 whitespace-pre-wrap text-text-muted">{viewGeneratedResource.generated_content}</p>
            </div>
          </article>
        </div>
      ) : null}

      {viewMaterial ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="material-view-title">
          <article className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-outline-soft bg-surface p-6 shadow-lg">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.08em] text-primary">Visualización completa</p>
                <h2 id="material-view-title" className="mt-1 text-2xl font-bold">
                  {viewMaterial.title}
                </h2>
                <p className="mt-2 text-text-muted">{viewMaterial.description}</p>
              </div>
              <button className="button-secondary" type="button" onClick={() => setViewMaterial(null)}>
                Cerrar
              </button>
            </div>
            <dl className="mt-5 grid gap-3 rounded-lg bg-surface-low p-4 md:grid-cols-4">
              <div>
                <dt className="text-sm font-bold text-text-muted">Tipo</dt>
                <dd>{materialTypeLabel(viewMaterial.material_type)}</dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-text-muted">Archivo</dt>
                <dd>{viewMaterial.original_filename ?? "Sin archivo asociado"}</dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-text-muted">Ritmo</dt>
                <dd>{materialRhythm(viewMaterial)}</dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-text-muted">Versión</dt>
                <dd>{viewMaterial.version}</dd>
              </div>
            </dl>
            <div className="mt-5 rounded-lg border border-outline-soft bg-surface-low p-4">
              <h3 className="font-bold">Contenido</h3>
              <p className="mt-2 whitespace-pre-wrap text-text-muted">
                {viewMaterial.text_content || viewMaterial.url || viewMaterial.original_filename || "Contenido no disponible para este material."}
              </p>
              {viewMaterial.file_path ? (
                <a className="button-primary mt-4 inline-flex" href={api.baseMaterialDownloadUrl(selectedModuleId, viewMaterial.id)} target="_blank" rel="noreferrer">
                  Descargar archivo
                </a>
              ) : null}
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}
