"use client";

import useSWR from "swr";
import type { StationEnvelope } from "@/lib/types";
import type { ApiResponse } from "@/lib/api-cache";

interface BasinEnvelopeData extends StationEnvelope {
  currentSeason: { wyDay: number; swe: number }[];
  stationCount: number;
}

export function useBasinEnvelopeData(huc: string | null) {
  const { data, error, isLoading } = useSWR<ApiResponse<BasinEnvelopeData>>(
    huc ? `/api/basins/${huc}/envelope` : null
  );
  return {
    data: data?.data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    fetchedAt: data?.fetchedAt ?? null,
    stale: data?.stale ?? false,
  };
}
