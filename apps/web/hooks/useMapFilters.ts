"use client";

import { useMemo } from "react";
import type { StationFilters } from "@snotel/core/filters";
import { storedValue, useStoredValue } from "@/lib/stored-value";

interface MapSettings {
  metric: string;
  states: string[];
  elevMin: string;
  elevMax: string;
  activeOnly: boolean;
  showStations: boolean;
  showHuc2: boolean;
  showHuc4: boolean;
  showSpots: boolean;
}

const DEFAULTS: MapSettings = {
  metric: "WTEQ",
  states: [],
  elevMin: "",
  elevMax: "",
  activeOnly: true,
  showStations: true,
  showHuc2: true,
  showHuc4: false,
  showSpots: true,
};

const settingsStore = storedValue<MapSettings>("snotel:map-settings", DEFAULTS, (raw) => ({ ...DEFAULTS, ...JSON.parse(raw) }));

function setting<K extends keyof MapSettings>(key: K) {
  return (value: MapSettings[K]) => settingsStore.set((prev) => ({ ...prev, [key]: value }));
}

const setters = {
  onMetricChange: setting("metric"),
  onShowStationsChange: setting("showStations"),
  onShowHuc2Change: setting("showHuc2"),
  onShowHuc4Change: setting("showHuc4"),
  onShowSpotsChange: setting("showSpots"),
  onActiveOnlyChange: setting("activeOnly"),
  onStatesChange: (states: Set<string>) => settingsStore.set((prev) => ({ ...prev, states: [...states] })),
  onElevMinChange: setting("elevMin"),
  onElevMaxChange: setting("elevMax"),
};

export function useMapFilters() {
  const settings = useStoredValue(settingsStore);
  const selectedStates = useMemo(() => new Set(settings.states), [settings.states]);

  const filters = useMemo<StationFilters>(
    () => ({
      states: selectedStates,
      elevMin: settings.elevMin ? Number(settings.elevMin) : null,
      elevMax: settings.elevMax ? Number(settings.elevMax) : null,
      activeOnly: settings.activeOnly,
    }),
    [selectedStates, settings.elevMin, settings.elevMax, settings.activeOnly]
  );

  return {
    filters,
    controls: {
      ...setters,
      metric: settings.metric,
      showStations: settings.showStations,
      showHuc2: settings.showHuc2,
      showHuc4: settings.showHuc4,
      showSpots: settings.showSpots,
      activeOnly: settings.activeOnly,
      selectedStates,
      elevMin: settings.elevMin,
      elevMax: settings.elevMax,
    },
  };
}
