"use client";

import { Fragment, useEffect, type ReactNode } from "react";
import { setUnits, type Units } from "@snotel/core/units";
import { storedValue, useStoredValue } from "@/lib/stored-value";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export type Appearance = "system" | "light" | "dark";

export interface AppSettings {
  units: Units;
  appearance: Appearance;
  homeState: string | null;
}

export const SETTINGS_KEY = "snotel:settings";

const DEFAULTS: AppSettings = { units: "imperial", appearance: "system", homeState: null };

export const settingsStore = storedValue<AppSettings>(SETTINGS_KEY, DEFAULTS, (raw) => ({ ...DEFAULTS, ...JSON.parse(raw) }));

export function useSettings(): AppSettings {
  return useStoredValue(settingsStore);
}

export function updateSettings(patch: Partial<AppSettings>): void {
  settingsStore.set((prev) => ({ ...prev, ...patch }));
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
