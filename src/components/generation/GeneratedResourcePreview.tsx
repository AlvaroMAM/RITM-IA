import type { LearningPath, ResourceType } from "../../types";
import { learningPathLabels, resourceTypeLabels } from "../../constants/generationLabels";
import { Icon } from "../ui/Icon";
import { AudioPlayer } from "../ui/AudioPlayer";

export type GeneratedResourceView = {
  title: string;
  summary: string;
  teacherNotes: string;
  sections: Array<{ heading: string; body: string }>;
  checklist: string[];
  status?: "draft" | "generated" | "reviewed" | "validated" | "published" | "discarded" | "archived";
};

export function GeneratedResourcePreview({
  resource,
  path,
  type,
  onEdit,
  onRegenerate,
  onDiscard,
  onValidate,
  onPublish,
}: {
  resource: GeneratedResourceView;
  path: LearningPath;
  type: ResourceType;
  onEdit: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
  onValidate: () => void;
  onPublish?: () => void;
}) {
  const statusLabels = {
    draft: "Borrador",
    generated: "Generado",
    reviewed: "Revisado",
    validated: "Validado",
    published: "Publicado",
    discarded: "Descartado",
    archived: "Archivado",
  };

  return (
    <section className="card overflow-hidden" aria-labelledby="generated-title">
      <div className="bg-primary p-5 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.08em]">Resultado generado</p>
        <h2 className="mt-2 text-2xl font-bold" id="generated-title">
          {resource.title}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-md bg-white/15 px-3 py-1">{learningPathLabels[path]}</span>
          <span className="rounded-md bg-white/15 px-3 py-1">{resourceTypeLabels[type]}</span>
          {resource.status ? <span className="rounded-md bg-white/15 px-3 py-1">{statusLabels[resource.status]}</span> : null}
        </div>
      </div>
      <div className="space-y-5 p-5">
        <p className="text-lg text-text-muted">{resource.summary}</p>
        <p className="rounded-md bg-surface-low p-4 text-sm text-text-muted">{resource.teacherNotes}</p>

        {type === "audio" && (
          <AudioPlayer
            title={resource.title}
            textToSpeak={`${resource.summary}\n\n${resource.sections.map((s) => `${s.heading}: ${s.body}`).join("\n\n")}`}
          />
        )}

        {resource.sections.map((section) => (
          <article key={section.heading} className="rounded-md border border-outline-soft p-4">
            <h3 className="font-bold text-primary">{section.heading}</h3>
            <p className="mt-2 text-text-muted">{section.body}</p>
            {type === "audio" && (
              <div className="mt-2 pt-2 border-t border-outline-soft/40">
                <AudioPlayer
                  title={`Audio de apartado: ${section.heading}`}
                  textToSpeak={`${section.heading}. ${section.body}`}
                />
              </div>
            )}
          </article>
        ))}

        <div>
          <h3 className="font-bold">Criterios aplicados</h3>
          <ul className="mt-3 grid gap-2 md:grid-cols-3">
            {resource.checklist.map((item) => (
              <li key={item} className="flex gap-2 rounded-md bg-surface-low p-3 text-sm">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-outline-soft pt-5">
          <button className="button-ghost" type="button" onClick={onDiscard}>
            <Icon name="trash" />
            Descartar
          </button>
          <button className="button-secondary" type="button" onClick={onEdit}>
            <Icon name="pencil" />
            Editar
          </button>
          <button className="button-secondary" type="button" onClick={onRegenerate}>
            <Icon name="refresh" />
            Regenerar
          </button>
          <button className="button-primary" type="button" onClick={onValidate}>
            <Icon name="check" />
            Validar
          </button>
          {onPublish ? (
            <button className="button-primary" type="button" onClick={onPublish}>
              <Icon name="send" />
              Publicar
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
