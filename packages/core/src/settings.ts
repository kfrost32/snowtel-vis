import type { Units } from "./units";

export type Appearance = "system" | "light" | "dark";

export interface AppSettings {
  units: Units;
  appearance: Appearance;
  homeState: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = { units: "imperial", appearance: "system", homeState: null };

export function parseSettings(raw: string | null): AppSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw ?? "{}") };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
