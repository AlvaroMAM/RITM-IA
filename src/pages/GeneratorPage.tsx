import { Navigate, useParams } from "react-router-dom";
import { resolveModuleId } from "../utils/moduleDisplay";

export function GeneratorPage() {
  const { asignaturaId = "" } = useParams();
  const moduleId = resolveModuleId(asignaturaId);

  return <Navigate to={`/docente/generador${moduleId ? `?modulo=${encodeURIComponent(moduleId)}` : ""}`} replace />;
}
