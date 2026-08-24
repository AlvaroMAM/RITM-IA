export type QuickAction = "explain" | "example" | "exercise" | "summary" | "check";

export const quickActions: Array<{ id: QuickAction; label: string }> = [
  { id: "explain", label: "Explícamelo de otra forma" },
  { id: "example", label: "Dame un ejemplo" },
  { id: "exercise", label: "Genera un ejercicio" },
  { id: "summary", label: "Resume el contenido" },
  { id: "check", label: "Comprueba mi respuesta" },
];
