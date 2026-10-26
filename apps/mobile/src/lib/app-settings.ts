import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";
import Storage from "expo-sqlite/kv-store";
import { setUnits, type Units } from "@snotel/core/units";

export type AppearanceSetting = "system" | "light" | "dark";

export interface AppSettings {
  units: Units;
  appearance: AppearanceSetting;
  homeState: string | null;
}

const KEY = "app:settings";
const DEFAULTS: AppSettings = { units: "imperial", appearance: "system", homeState: null };
const listeners = new Set<() => void>();

function read(): AppSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(Storage.getItemSync(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

function apply(settings: AppSettings) {
  setUnits(settings.units);
  Appearance.setColorScheme(settings.appearance === "system" ? "unspecified" : settings.appearance);
}

let snapshot = read();
apply(snapshot);

export function updateAppSettings(patch: Partial<AppSettings>) {
  snapshot = { ...snapshot, ...patch };
  apply(snapshot);
  Storage.setItemSync(KEY, JSON.stringify(snapshot));
  listeners.forEach((l) => l());
}

export function useAppSettings(): AppSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot
  );
}
