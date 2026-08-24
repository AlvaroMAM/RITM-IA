import { Icon, type IconName } from "./Icon";

export function EmptyState({ title, body, icon = "file" }: { title: string; body: string; icon?: IconName }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-high text-primary">
        <Icon name={icon} />
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="max-w-md text-text-muted">{body}</p>
    </div>
  );
}
