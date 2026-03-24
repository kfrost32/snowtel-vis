"use client";

import useSWR from "swr";
import type { StationEnvelope } from "@/lib/types";

interface BasinEnvelopeData extends StationEnvelope {
  currentSeason: { wyDay: number; swe: number }[];
  stationCount: number;
}

export function useBasinEnvelopeData(huc: string | null) {
  const { data, error, isLoading } = useSWR<BasinEnvelopeData>(
    huc ? `/api/basins/${huc}/envelope` : null
  );
  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
