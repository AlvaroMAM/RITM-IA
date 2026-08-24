import type { LearningPath } from "../../types";
import { learningPathLabels } from "../../constants/generationLabels";

const descriptions: Record<LearningPath, string> = {
  refuerzo: "Paso a paso, vocabulario sencillo y ayudas visibles.",
  estandar: "Aplicacion directa, dificultad media y menos pistas.",
  ampliacion: "Reto abierto, justificacion y opcion de optimizar.",
};

export function LearningPathSelector({
  value,
  onChange,
}: {
  value: LearningPath;
  onChange: (value: LearningPath) => void;
}) {
  return (
    <fieldset>
      <legend className="field-label">Itinerario de aprendizaje</legend>
      <div className="grid gap-3 md:grid-cols-3">
        {(Object.keys(learningPathLabels) as LearningPath[]).map((path) => (
          <label
            key={path}
            className={`card cursor-pointer p-4 transition ${value === path ? "border-primary bg-primary/5" : "hover:border-primary"}`}
          >
            <input
              checked={value === path}
              className="sr-only"
              name="learning-path"
              type="radio"
              value={path}
              onChange={() => onChange(path)}
            />
            <span className="font-bold text-primary">{learningPathLabels[path]}</span>
            <span className="mt-2 block text-sm text-text-muted">{descriptions[path]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
