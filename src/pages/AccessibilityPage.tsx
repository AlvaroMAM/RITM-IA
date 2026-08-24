import { useOutletContext } from "react-router-dom";
import { AccessibilityPanel } from "../components/accessibility/AccessibilityPanel";
import type { Role } from "../types";

export function AccessibilityPage() {
  const { role } = useOutletContext<{ role: Role }>();
  const isTeacher = role === "teacher";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">{isTeacher ? "Personaliza tu interfaz docente" : "Personaliza tu aprendizaje"}</h1>
        <p className="mt-2 max-w-3xl text-lg text-text-muted">
          {isTeacher
            ? "Ajusta el entorno de trabajo del profesorado para adaptarlo a tus necesidades visuales y cognitivas. Incluye dislexia, daltonismo y acromatopsia."
            : "Ajusta la interfaz para adaptarla a tus necesidades visuales y cognitivas. En este MVP los cambios se guardan en localStorage."}
        </p>
      </header>
      <AccessibilityPanel />
    </div>
  );
}
