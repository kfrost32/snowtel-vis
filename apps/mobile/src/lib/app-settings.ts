import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";
import Storage from "expo-sqlite/kv-store";
import { setUnits } from "@snotel/core/units";
import { parseSettings, type AppSettings } from "@snotel/core/settings";

export type { AppSettings, Appearance as AppearanceSetting } from "@snotel/core/settings";

const KEY = "app:settings";
const listeners = new Set<() => void>();

function applyAppearance(appearance: AppSettings["appearance"]) {
  Appearance.setColorScheme(appearance === "system" ? "unspecified" : appearance);
}

let snapshot = parseSettings(Storage.getItemSync(KEY));
setUnits(snapshot.units);
applyAppearance(snapshot.appearance);

export function updateAppSettings(patch: Partial<AppSettings>) {
  const previous = snapshot;
  snapshot = { ...snapshot, ...patch };
  setUnits(snapshot.units);
  if (snapshot.appearance !== previous.appearance) applyAppearance(snapshot.appearance);
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

export function useUnitsKey(): string {
  return useAppSettings().units;
}
