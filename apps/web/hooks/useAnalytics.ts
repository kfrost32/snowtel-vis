"use client";

import { useEffect } from "react";
import { getStation } from "@snotel/core/stations";
import { track } from "@/lib/analytics";

export function useAnalytics(selectedStation: string | null, selectedBasin: { huc: string; name: string } | null) {
  const basinHuc = selectedBasin?.huc ?? null;
  const basinName = selectedBasin?.name;

  useEffect(() => {
    if (selectedStation) {
      const station = getStation(selectedStation);
      track("view_station", { station_id: selectedStation, station_name: station?.name, state: station?.state });
    } else if (basinHuc) {
      track("view_region", { region_id: basinHuc, region_name: basinName });
    }
  }, [selectedStation, basinHuc, basinName]);
}
