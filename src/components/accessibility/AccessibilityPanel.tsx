import type { AccessibilitySettings } from "../../types";
import { useAccessibilitySettings } from "../../hooks/useAccessibilitySettings";
import { Icon } from "../ui/Icon";

const textOptions: Array<{ value: AccessibilitySettings["textSize"]; label: string; hint: string }> = [
  { value: "small", label: "Pequeno", hint: "94%" },
  { value: "normal", label: "Normal", hint: "100%" },
  { value: "large", label: "Grande", hint: "112%" },
  { value: "xlarge", label: "Extra", hint: "124%" },
];

const colorVisionOptions: Array<{ value: AccessibilitySettings["colorVision"]; label: string; hint: string }> = [
  { value: "normal", label: "Sin ajuste", hint: "Paleta institucional" },
  { value: "protanopia", label: "Protanopia", hint: "Reduce dependencia rojo-verde" },
  { value: "deuteranopia", label: "Deuteranopia", hint: "Refuerza contraste tonal" },
  { value: "tritanopia", label: "Tritanopia", hint: "Diferencia azules y amarillos" },
  { value: "achromatopsia", label: "Acromatopsia", hint: "Interfaz en alto contraste sin color" },
];

export function AccessibilityPanel() {
  const { settings, updateSettings, resetSettings } = useAccessibilitySettings();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="section-title flex items-center gap-2">
            <Icon name="accessibility" className="text-primary" />
            Tipografia y lectura
          </h2>

          <fieldset className="mt-5">
            <legend className="field-label">Tamano de texto</legend>
            <div className="grid gap-3 sm:grid-cols-4">
              {textOptions.map((option) => (
                <label
                  key={option.value}
                  className={`card cursor-pointer p-4 ${settings.textSize === option.value ? "border-primary bg-primary/5" : ""}`}
                >
                  <input
                    checked={settings.textSize === option.value}
                    className="sr-only"
                    name="text-size"
                    type="radio"
                    onChange={() => updateSettings({ textSize: option.value })}
                  />
                  <span className="font-bold">{option.label}</span>
                  <span className="block text-sm text-text-muted">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 flex min-h-14 items-center justify-between gap-4 rounded-lg border border-outline-soft p-4">
            <span>
              <span className="block font-bold">Mayor espaciado</span>
              <span className="text-sm text-text-muted">Aumenta la separacion vertical entre bloques.</span>
            </span>
            <input
              checked={settings.spacing === "wide"}
              className="h-6 w-6 accent-primary"
              type="checkbox"
              onChange={(event) => updateSettings({ spacing: event.target.checked ? "wide" : "normal" })}
            />
          </label>

          <fieldset className="mt-5">
            <legend className="field-label">Letra adaptada para dislexia</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {(["atkinson", "dyslexia"] as const).map((font) => (
                <label
                  key={font}
                  className={`card cursor-pointer p-4 ${settings.readingFont === font ? "border-primary bg-primary/5" : ""}`}
                >
                  <input
                    checked={settings.readingFont === font}
                    className="sr-only"
                    name="reading-font"
                    type="radio"
                    onChange={() => updateSettings({ readingFont: font })}
                  />
                  <span className="font-bold">{font === "atkinson" ? "Atkinson Hyperlegible" : "Alternativa dislexia"}</span>
                  <span className="block text-sm text-text-muted">
                    {font === "atkinson" ? "Fuente principal del sistema" : "Usa una fuente local segura si esta disponible"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="card p-6">
          <h2 className="section-title flex items-center gap-2">
            <Icon name="contrast" className="text-primary" />
            Color y contraste
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <fieldset>
              <legend className="field-label">Tema</legend>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-low p-1">
                {(["light", "dark"] as const).map((theme) => (
                  <button
                    key={theme}
                    className={`min-h-12 rounded-md font-bold ${settings.theme === theme ? "bg-surface text-primary shadow-sm" : "text-text-muted"}`}
                    type="button"
                    onClick={() => updateSettings({ theme })}
                  >
                    {theme === "light" ? "Claro" : "Oscuro"}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="field-label">Contraste</legend>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-low p-1">
                {(["normal", "high"] as const).map((contrast) => (
                  <button
                    key={contrast}
                    className={`min-h-12 rounded-md font-bold ${settings.contrast === contrast ? "bg-surface text-primary shadow-sm" : "text-text-muted"}`}
                    type="button"
                    onClick={() => updateSettings({ contrast })}
                  >
                    {contrast === "normal" ? "Normal" : "Alto"}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className="mt-5">
            <legend className="field-label">Daltonismo y acromatopsia</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {colorVisionOptions.map((option) => (
                <label
                  key={option.value}
                  className={`card cursor-pointer p-4 ${settings.colorVision === option.value ? "border-primary bg-primary/5" : ""}`}
                >
                  <input
                    checked={settings.colorVision === option.value}
                    className="sr-only"
                    name="color-vision"
                    type="radio"
                    onChange={() => updateSettings({ colorVision: option.value })}
                  />
                  <span className="font-bold">{option.label}</span>
                  <span className="block text-sm text-text-muted">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="card p-6">
          <h2 className="section-title flex items-center gap-2">
            <Icon name="gauge" className="text-primary" />
            Modo de enfoque
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-outline-soft p-4">
              <span>
                <span className="block font-bold">Modo de enfoque</span>
                <span className="text-sm text-text-muted">Reduce elementos secundarios durante el estudio.</span>
              </span>
              <input
                checked={settings.focusMode}
                className="h-6 w-6 accent-primary"
                type="checkbox"
                onChange={(event) => updateSettings({ focusMode: event.target.checked })}
              />
            </label>
            <label className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-outline-soft p-4">
              <span>
                <span className="block font-bold">Reducir animaciones</span>
                <span className="text-sm text-text-muted">Respeta una interfaz con menos movimiento.</span>
              </span>
              <input
                checked={settings.reduceMotion}
                className="h-6 w-6 accent-primary"
                type="checkbox"
                onChange={(event) => updateSettings({ reduceMotion: event.target.checked })}
              />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3 border-t border-outline-soft pt-5">
          <button className="button-secondary" type="button" onClick={resetSettings}>
            Restaurar valores
          </button>
          <button className="button-primary" type="button">
            Guardado automaticamente
          </button>
        </div>
      </div>

      <aside className="card h-fit overflow-hidden xl:sticky xl:top-24">
        <div className="flex items-center justify-between bg-primary p-4 text-white">
          <h2 className="font-bold uppercase tracking-[0.08em]">Vista previa</h2>
          <Icon name="accessibility" />
        </div>
        <div className="space-y-5 p-6">
          <h3 className="text-3xl font-bold">UT2. Manipulacion de datos con Python</h3>
          <p className="text-text-muted">
            Aprende a tomar decisiones con condicionales, repetir instrucciones con bucles y comprobar que el programa se comporta como esperas.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <span className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-center font-bold text-primary">
              ✓ Condicionales
            </span>
            <span className="rounded-lg border border-secondary/30 bg-secondary/10 p-4 text-center font-bold text-primary">
              # Bucles
            </span>
          </div>
          <div className="grid gap-3 text-sm">
            <span className="rounded-md border-l-4 border-primary bg-surface-low p-3">
              Estado: completado. Se muestra con texto, icono y borde.
            </span>
            <span className="rounded-md border-l-4 border-tertiary bg-surface-low p-3">
              Aviso: pendiente de revisar. No depende solo del color.
            </span>
          </div>
          <button className="button-primary w-full" type="button">
            Continuar unidad
          </button>
          <p className="rounded-md bg-surface-low p-4 text-sm text-text-muted">
            Estos ajustes se guardan en este navegador mediante localStorage durante el MVP.
          </p>
        </div>
      </aside>
    </div>
  );
}
