import { Link, NavLink, useLocation } from "react-router-dom";
import type { ApiUser } from "../../api/client";
import type { Role } from "../../types";
import { Icon, type IconName } from "../ui/Icon";

type NavItem = {
  to: string;
  label: string;
  icon: IconName;
  match: (pathname: string) => boolean;
};

const teacherItems: NavItem[] = [
  {
    to: "/docente/inicio",
    label: "Inicio",
    icon: "home",
    match: (path) => path === "/docente/inicio",
  },
  {
    to: "/docente/asignaturas",
    label: "Mis módulos",
    icon: "graduation",
    match: (path) =>
      path === "/docente/asignaturas" ||
      path.startsWith("/docente/unidades/") ||
      (path.startsWith("/docente/asignaturas/") && !path.includes("/generador")),
  },
  {
    to: "/docente/contenidos",
    label: "Gestión de contenidos",
    icon: "folder",
    match: (path) => path.startsWith("/docente/contenidos") || path.startsWith("/docente/modulos/"),
  },
  {
    to: "/docente/generador",
    label: "Generador",
    icon: "sparkles",
    match: (path) => path === "/docente/generador" || path === "/docente/asistente" || path.includes("/generador"),
  },
  {
    to: "/docente/recursos",
    label: "Recursos generados",
    icon: "file",
    match: (path) => path.startsWith("/docente/recursos"),
  },
  {
    to: "/docente/seguimiento",
    label: "Alumnado y seguimiento",
    icon: "users",
    match: (path) => path.startsWith("/docente/seguimiento"),
  },
  {
    to: "/docente/indicadores",
    label: "Indicadores del proyecto",
    icon: "gauge",
    match: (path) => path.startsWith("/docente/indicadores"),
  },
  { to: "/accesibilidad", label: "Accesibilidad", icon: "accessibility", match: (path) => path === "/accesibilidad" },
];

const studentItems: NavItem[] = [
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
  { to: "/accesibilidad", label: "Accesibilidad", icon: "accessibility", match: (path) => path === "/accesibilidad" },
];

export function Sidebar({
  role,
  user,
  onLogout,
  collapsed,
  onToggle,
}: {
  role: Role;
  user: ApiUser;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const items = role === "teacher" ? teacherItems : studentItems;
  const location = useLocation();
  const homePath = role === "teacher" ? "/docente/asignaturas" : "/alumno";
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 hidden h-screen w-sidebar flex-col overflow-y-auto border-r border-outline-soft bg-surface-low px-5 py-6 transition-transform duration-200 lg:flex ${
        collapsed ? "-translate-x-full" : "translate-x-0"
      }`}
    >
      <button
        className="absolute right-3 top-1/2 z-10 flex h-16 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-surface-high text-primary shadow-soft transition hover:bg-primary hover:text-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
        type="button"
        aria-label="Ocultar menu lateral"
        onClick={onToggle}
      >
        <Icon name="chevron" className="h-7 w-7 rotate-180" />
      </button>

      <div className="mb-8 shrink-0">
        <Link
          className="block text-5xl font-extrabold leading-none text-primary transition hover:text-primary-strong"
          to={homePath}
          aria-label="Ir al panel principal"
        >
          RITM-IA
        </Link>
        <p className="mt-3 text-sm font-bold uppercase tracking-[0.08em] text-text-muted">
          Portal {role === "teacher" ? "docente" : "alumno"}
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-2 pb-6" aria-label="Navegacion principal">
        {items.map((item) => {
          const active = item.match(location.pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={() =>
                [
                  "flex min-h-14 items-center gap-3 rounded-md px-4 py-3 font-bold transition",
                  active
                    ? "bg-primary text-white shadow-soft"
                    : "text-text-muted hover:bg-surface-high hover:text-primary",
                ].join(" ")
              }
              aria-current={active ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-4">
        <div className="rounded-lg bg-surface p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              {initials}
            </span>
            <div>
              <p className="font-bold">{user.name}</p>
              <p className="text-sm text-text-muted">{role === "teacher" ? "Docente" : "Alumno"} conectado</p>
            </div>
          </div>
        </div>
        <button className="button-secondary w-full" type="button" onClick={onLogout}>
          <Icon name="logout" />
          Salir
        </button>
      </div>
    </aside>
  );
}
