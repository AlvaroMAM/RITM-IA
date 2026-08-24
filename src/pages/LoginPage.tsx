import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { ApiUser } from "../api/client";
import { Icon } from "../components/ui/Icon";
import { useAccessibilitySettings } from "../hooks/useAccessibilitySettings";

export function LoginPage({ onLogin }: { onLogin: (username: string, password: string) => Promise<ApiUser> }) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useAccessibilitySettings();
  const [username, setUsername] = useState("profesor");
  const [password, setPassword] = useState("ritmia2026");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      const user = await onLogin(username, password);
      navigate(user.role === "teacher" ? "/docente/asignaturas" : "/alumno");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo iniciar sesion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="route-shell flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <button
        className="absolute right-5 top-5 flex h-14 w-14 items-center justify-center rounded-lg bg-surface-high text-primary shadow-sm"
        type="button"
        aria-label="Cambiar tema"
        onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
      >
        <Icon name="moon" />
      </button>

      <section className="w-full max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg bg-primary text-white shadow-soft">
          <Icon name="graduation" className="h-10 w-10" />
        </div>
        <h1 className="text-5xl font-extrabold leading-none text-primary md:text-6xl">RITM-IA</h1>
        <p className="mt-3 text-sm font-bold uppercase tracking-[0.16em] text-text-muted">MVP educativo RITM-IA</p>

        <form className="card mt-10 border-l-4 border-l-primary p-6 text-left shadow-soft" onSubmit={submit}>
          <h2 className="section-title">Inicio de sesion</h2>
          <p className="mt-2 text-text-muted">Accede con usuario y contraseña para abrir el panel correspondiente.</p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="field-label">Usuario</span>
              <input
                className="field"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="field-label">Contraseña</span>
              <input
                className="field"
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button className="button-primary w-full" type="submit" disabled={loading}>
              <Icon name="check" />
              {loading ? "Validando..." : "Iniciar sesion"}
            </button>
            {status ? (
              <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-700" role="alert">
                {status}
              </p>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-surface-low p-4">
              <p className="font-bold text-primary">Docente</p>
              <p className="text-sm text-text-muted">Usuario: profesor · Contraseña: ritmia2026</p>
            </div>
            <div className="rounded-md bg-surface-low p-4">
              <p className="font-bold text-primary">Alumno estándar</p>
              <p className="text-sm text-text-muted">Usuario: alumna.estandar · Contraseña: ritmia2026</p>
            </div>
            <div className="rounded-md bg-surface-low p-4">
              <p className="font-bold text-primary">Alumna refuerzo</p>
              <p className="text-sm text-text-muted">Usuario: alumna.refuerzo · Contraseña: ritmia2026</p>
            </div>
            <div className="rounded-md bg-surface-low p-4">
              <p className="font-bold text-primary">Alumno ampliación</p>
              <p className="text-sm text-text-muted">Usuario: alumno.ampliacion · Contraseña: ritmia2026</p>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
