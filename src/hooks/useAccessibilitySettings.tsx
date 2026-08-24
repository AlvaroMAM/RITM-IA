import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { AccessibilitySettings } from "../types";

const STORAGE_KEY = "ritm-ia-accessibility";

const defaultSettings: AccessibilitySettings = {
  textSize: "normal",
  contrast: "normal",
  theme: "light",
  readingFont: "atkinson",
  colorVision: "normal",
  spacing: "normal",
  focusMode: false,
  reduceMotion: false,
};

type AccessibilityContextValue = {
  settings: AccessibilitySettings;
  setSettings: (settings: AccessibilitySettings) => void;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function loadSettings(): AccessibilitySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    return defaultSettings;
  }
}

function applySettings(settings: AccessibilitySettings) {
  const html = document.documentElement;
  html.dataset.textSize = settings.textSize;
  html.dataset.contrast = settings.contrast;
  html.dataset.theme = settings.theme;
  html.dataset.readingFont = settings.readingFont;
  html.dataset.colorVision = settings.colorVision;
  html.dataset.spacing = settings.spacing;
  document.body.classList.toggle("focus-mode", settings.focusMode);
  document.body.classList.toggle("reduce-motion", settings.reduceMotion);
}

export function AccessibilityProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AccessibilitySettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applySettings(settings);
  }, [settings]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      settings,
      setSettings,
      updateSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
      resetSettings: () => setSettings(defaultSettings),
    }),
    [settings],
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibilitySettings() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibilitySettings must be used inside AccessibilityProvider");
  }
  return context;
}
