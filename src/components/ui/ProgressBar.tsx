export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(value, 100));

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between gap-3 text-sm font-bold text-text-muted">
        <span>{label ?? "Progreso"}</span>
        <span>{clamped}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-high" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
