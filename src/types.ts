export type Role = "teacher" | "student";

export type LearningPath = "refuerzo" | "estandar" | "ampliacion";

export type ResourceType = "explicacion" | "ejercicio" | "reto" | "resumen" | "audio" | "mapa_mental";

export type AccessibilitySettings = {
  textSize: "normal" | "small" | "large" | "xlarge";
  contrast: "normal" | "high";
  theme: "light" | "dark";
  readingFont: "atkinson" | "dyslexia";
  colorVision: "normal" | "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";
  spacing: "normal" | "wide";
  focusMode: boolean;
  reduceMotion: boolean;
};

export type Course = {
  id: string;
  title: string;
  cycle: string;
  year: string;
  unitsCount: number;
  studentsCount: number;
  progress: number;
  badge: string;
  accent: "green" | "orange" | "blue";
};

export type Unit = {
  id: string;
  courseId: string;
  code: string;
  title: string;
  description: string;
  learningOutcome: string;
  criteria: string[];
  progress: number;
  lessons: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
  }>;
  resources: Array<{
    id: string;
    title: string;
    type: string;
    date: string;
  }>;
  activities: Array<{
    id: string;
    title: string;
    description: string;
    status: "pendiente" | "en curso" | "completada";
  }>;
};

export type StudentModule = {
  id: string;
  title: string;
  cycle: "ASIR";
  year: string;
  progress: number;
  teacher: string;
  learningPath?: "Refuerzo" | "Estándar" | "Ampliación";
  units: Array<{
    id: string;
    code: string;
    title: string;
    progress: number;
    description?: string;
    learningOutcome?: string;
    criteria?: string[];
    contents?: string[];
    materials?: Array<{
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
    }>;
  }>;
};
