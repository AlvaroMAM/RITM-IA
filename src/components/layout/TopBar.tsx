import { Link } from "react-router-dom";
import type { ApiUser } from "../../api/client";
import type { Role } from "../../types";
import { useAccessibilitySettings } from "../../hooks/useAccessibilitySettings";
import { Icon } from "../ui/Icon";

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function TopBar({ role, user, sidebarCollapsed = false }: { role: Role; user: ApiUser; sidebarCollapsed?: boolean }) {
  const { settings, updateSettings } = useAccessibilitySettings();

  return (
    <header className="sticky top-0 z-30 border-b border-outline-soft bg-background/95 backdrop-blur">
      <div className={`flex min-h-16 items-center gap-3 px-4 transition-[padding] duration-200 lg:px-8 ${sidebarCollapsed ? "lg:pl-24" : ""}`}>
        <Link className="mr-2 text-2xl font-extrabold text-primary lg:hidden" to={role === "teacher" ? "/docente/asignaturas" : "/alumno"}>
          RITM-IA
        </Link>

        <label className={`relative hidden flex-1 md:block ${sidebarCollapsed ? "mx-auto max-w-2xl" : "max-w-xl"}`}>
          <span className="sr-only">Buscar</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input className="field rounded-full py-2 pl-12" placeholder="Buscar unidades, recursos o alumnado..." type="search" />
        </label>

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-muted hover:bg-surface-high hover:text-primary"
            type="button"
            aria-label="Cambiar contraste"
            onClick={() => updateSettings({ contrast: settings.contrast === "high" ? "normal" : "high" })}
          >
            <Icon name="contrast" />
          </button>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-muted hover:bg-surface-high hover:text-primary"
            type="button"
            aria-label="Cambiar tema"
            onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
          >
            <Icon name="moon" />
          </button>
          <Link
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-muted hover:bg-surface-high hover:text-primary"
            to="/accesibilidad"
            aria-label="Abrir accesibilidad"
          >
            <Icon name="accessibility" />
          </Link>
          <span className="hidden font-bold sm:inline">{user.name}</span>
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary bg-surface-high text-sm font-bold text-primary">
            {initialsFor(user.name)}
          </span>
        </div>
      </div>
    </header>
  );
}
