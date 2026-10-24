"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { StationEnvelope } from "@snotel/core/types";
import type { ApiResponse } from "@snotel/core/types";
import { expandEnvelope, type BasinEnvelopeFile } from "@snotel/core/envelope-files";
import { calendarRowToWyDay, getCurrentWaterYear } from "@snotel/core/water-year";

interface BasinEnvelopeData extends StationEnvelope {
  currentSeason: { wyDay: number; swe: number }[];
  stationCount: number;
}

export function useBasinEnvelopeData(huc: string | null) {
  const { data: file, error, isLoading } = useSWR<BasinEnvelopeFile>(
    huc ? `/envelopes/basins/${huc}.json` : null
  );
  const { data: season } = useSWR<ApiResponse<{ wyDay: number; swe: number }[]>>(
    huc ? `/api/basins/${huc}/season` : null
  );
  const data = useMemo((): BasinEnvelopeData | null => {
    if (!file) return null;
    const wy = getCurrentWaterYear();
    return {
      envelope: expandEnvelope(file.swe, wy),
      medianPeakDay: calendarRowToWyDay(file.swe.peakDay, wy),
      medianPeakRow: file.swe.peakDay,
      medianPeakSwe: file.swe.peak,
      depthEnvelope: [],
      medianPeakDepthDay: 0,
      medianPeakDepth: 0,
      currentSeason: season?.data ?? [],
      stationCount: file.stationCount,
    };
  }, [file, season]);
  return {
    data,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
