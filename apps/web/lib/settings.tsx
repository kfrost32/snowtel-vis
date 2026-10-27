"use client";

import { Fragment, useEffect, type ReactNode } from "react";
import { setUnits } from "@snotel/core/units";
import { DEFAULT_SETTINGS, parseSettings, type AppSettings } from "@snotel/core/settings";
import { storedValue, useStoredValue } from "@/lib/stored-value";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { track } from "@/lib/analytics";

export type { Appearance, AppSettings } from "@snotel/core/settings";

export const SETTINGS_KEY = "snotel:settings";

export const settingsStore = storedValue<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS, parseSettings);

export function useSettings(): AppSettings {
  return useStoredValue(settingsStore);
}

export function updateSettings(patch: Partial<AppSettings>): void {
  settingsStore.set((prev) => ({ ...prev, ...patch }));
  for (const [setting, value] of Object.entries(patch)) track("change_setting", { setting, value: value ?? "none" });
}

export function useIsDark(): boolean {
  const { appearance } = useSettings();
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  return appearance === "dark" || (appearance === "system" && systemDark);
}

export const appearanceScript = `try{var s=JSON.parse(localStorage.getItem("${SETTINGS_KEY}")||"{}");if(s.appearance==="light"||s.appearance==="dark")document.documentElement.dataset.theme=s.appearance}catch(e){}`;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { units, appearance } = useSettings();
  setUnits(units);

  useEffect(() => {
    const root = document.documentElement;
    if (appearance === "system") delete root.dataset.theme;
    else root.dataset.theme = appearance;
  }, [appearance]);

  return <Fragment key={units}>{children}</Fragment>;
}
