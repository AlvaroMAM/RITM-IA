import { NavLink, useLocation } from "react-router-dom";
import type { Role } from "../../types";
import { Icon, type IconName } from "../ui/Icon";

const mobileItems: Record<Role, Array<{ to: string; label: string; icon: IconName; match: (pathname: string) => boolean }>> = {
  teacher: [
    { to: "/docente/inicio", label: "Inicio", icon: "home", match: (path) => path === "/docente/inicio" },
    {
      to: "/docente/asignaturas",
      label: "Módulos",
      icon: "graduation",
      match: (path) =>
        path === "/docente/asignaturas" ||
        path.startsWith("/docente/unidades/") ||
        (path.startsWith("/docente/asignaturas/") && !path.includes("/generador")),
    },
    { to: "/docente/contenidos", label: "Contenidos", icon: "folder", match: (path) => path.startsWith("/docente/contenidos") || path.startsWith("/docente/modulos/") },
    { to: "/docente/generador", label: "Generador", icon: "sparkles", match: (path) => path === "/docente/generador" || path === "/docente/asistente" || path.includes("/generador") },
    { to: "/docente/seguimiento", label: "Seguimiento", icon: "users", match: (path) => path.startsWith("/docente/seguimiento") },
    { to: "/accesibilidad", label: "Ajustes", icon: "accessibility", match: (path) => path === "/accesibilidad" },
  ],
  student: [
    { to: "/alumno", label: "Panel", icon: "dashboard", match: (path) => path === "/alumno" },
    {
      to: "/alumno/modulos",
      label: "Módulos",
      icon: "folder",
      match: (path) => (path.startsWith("/alumno/unidades/") && !path.endsWith("/asistente")) || path === "/alumno/modulos" || path.startsWith("/alumno/modulos/"),
    },
    {
      to: "/alumno/asistente",
      label: "Asistente",
      icon: "bot",
      match: (path) => path === "/alumno/asistente" || path.endsWith("/asistente"),
    },
    { to: "/accesibilidad", label: "Ajustes", icon: "accessibility", match: (path) => path === "/accesibilidad" },
  ],
};

export function MobileNavigation({ role }: { role: Role }) {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-outline-soft bg-surface px-2 lg:hidden" aria-label="Navegacion movil">
      {mobileItems[role].map((item) => {
        const active = item.match(location.pathname);
        return (
        <NavLink
          key={item.to}
          to={item.to}
          className={() =>
            [
              "flex min-w-16 flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-bold",
              active ? "text-primary" : "text-text-muted",
            ].join(" ")
          }
          aria-current={active ? "page" : undefined}
        >
          <Icon name={item.icon} className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
        );
      })}
    </nav>
  );
}
