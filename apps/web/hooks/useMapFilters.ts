"use client";

import { useMemo, useState } from "react";
import type { StationFilters } from "@snotel/core/filters";

export function useMapFilters() {
  const [metric, setMetric] = useState("WTEQ");
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [elevMin, setElevMin] = useState("");
  const [elevMax, setElevMax] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showHuc2, setShowHuc2] = useState(true);
  const [showHuc4, setShowHuc4] = useState(false);
  const [showSpots, setShowSpots] = useState(true);

  const filters = useMemo<StationFilters>(
    () => ({ states: selectedStates, elevMin: elevMin ? Number(elevMin) : null, elevMax: elevMax ? Number(elevMax) : null, activeOnly }),
    [selectedStates, elevMin, elevMax, activeOnly]
  );

  return {
    filters,
    controls: {
      metric,
      onMetricChange: setMetric,
      showStations,
      onShowStationsChange: setShowStations,
      showHuc2,
      onShowHuc2Change: setShowHuc2,
      showHuc4,
      onShowHuc4Change: setShowHuc4,
      showSpots,
      onShowSpotsChange: setShowSpots,
      activeOnly,
      onActiveOnlyChange: setActiveOnly,
      selectedStates,
      onStatesChange: setSelectedStates,
      elevMin,
      elevMax,
      onElevMinChange: setElevMin,
      onElevMaxChange: setElevMax,
    },
  };
}
