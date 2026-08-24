import { Icon } from "./Icon";

export function LoadingState({ label = "Preparando contenido" }: { label?: string }) {
  return (
    <div className="card flex items-center gap-4 p-5" role="status" aria-live="polite">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon name="refresh" className="h-6 w-6 animate-spin" />
      </span>
      <div>
        <p className="font-bold text-text">{label}</p>
        <p className="text-sm text-text-muted">Procesando la solicitud.</p>
      </div>
    </div>
  );
}
