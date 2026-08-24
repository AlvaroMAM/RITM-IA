import type { LearningPath, ResourceType } from "../types";

export const learningPathLabels: Record<LearningPath, string> = {
  refuerzo: "Refuerzo",
  estandar: "Estándar",
  ampliacion: "Ampliación",
};

export const resourceTypeLabels: Record<ResourceType, string> = {
  explicacion: "Explicación adaptada",
  ejercicio: "Ejercicio práctico",
  reto: "Reto abierto",
  resumen: "Resumen de estudio",
  audio: "Podcast / Píldora de audio",
  mapa_mental: "Mapa mental / Esquema visual",
};
