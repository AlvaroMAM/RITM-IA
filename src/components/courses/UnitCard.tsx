import { Link } from "react-router-dom";
import type { Unit } from "../../types";
import { Icon } from "../ui/Icon";
import { ProgressBar } from "../ui/ProgressBar";

export function UnitCard({ unit }: { unit: Unit }) {
  return (
    <article className="card overflow-hidden">
      <div className="bg-gradient-to-br from-primary via-primary-strong to-tertiary p-6 text-white">
        <span className="rounded-md bg-white/15 px-3 py-1 text-sm font-bold">{unit.code}</span>
        <h2 className="mt-4 text-2xl font-bold">{unit.title}</h2>
        <p className="mt-2 max-w-2xl text-white/90">{unit.description}</p>
      </div>
      <div className="space-y-4 p-5">
        <ProgressBar value={unit.progress} label="Progreso unidad" />
        <p className="text-sm font-bold text-primary">{unit.learningOutcome}</p>
        <div className="flex flex-wrap gap-3">
          <Link className="button-primary" to={`/alumno/unidades/${unit.id}`}>
            <Icon name="play" />
            Abrir módulo
          </Link>
          <Link className="button-secondary" to={`/alumno/unidades/${unit.id}/asistente`}>
            <Icon name="bot" />
            Asistente
          </Link>
        </div>
      </div>
    </article>
  );
}
