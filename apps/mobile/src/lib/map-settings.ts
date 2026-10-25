import { useSyncExternalStore } from "react";
import Storage from "expo-sqlite/kv-store";

export interface MapSettings {
  metric: string;
  showStations: boolean;
  showRegions: boolean;
  showSubregions: boolean;
  showSpots: boolean;
  activeOnly: boolean;
  states: string[];
  elevMin: number | null;
  elevMax: number | null;
}

const KEY = "map:settings";
const DEFAULTS: MapSettings = {
  metric: "WTEQ_PCT",
  showStations: true,
  showRegions: false,
  showSubregions: false,
  showSpots: true,
  activeOnly: true,
  states: [],
  elevMin: null,
  elevMax: null,
};

const listeners = new Set<() => void>();

function read(): MapSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(Storage.getItemSync(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

let snapshot = read();

export function updateMapSettings(patch: Partial<MapSettings>) {
  snapshot = { ...snapshot, ...patch };
  Storage.setItemSync(KEY, JSON.stringify(snapshot));
  listeners.forEach((l) => l());
}

export function resetMapFilters() {
  updateMapSettings({ activeOnly: DEFAULTS.activeOnly, states: [], elevMin: null, elevMax: null });
}

export function activeFilterCount(s: MapSettings): number {
  return (s.states.length ? 1 : 0) + (s.elevMin !== null ? 1 : 0) + (s.elevMax !== null ? 1 : 0);
}

export function useMapSettings(): MapSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot
  );
}
