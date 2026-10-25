"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { StationEnvelope } from "@snotel/core/types";
import type { ApiResponse } from "@snotel/core/types";
import type { BasinEnvelopeFile } from "@snotel/core/envelope-files";
import { toBasinEnvelope } from "@snotel/core/station-stats";
import { endpoints } from "@snotel/core/endpoints";

interface BasinEnvelopeData extends StationEnvelope {
  currentSeason: { wyDay: number; swe: number }[];
  stationCount: number;
}

export function useBasinEnvelopeData(huc: string | null) {
  const { data: file, error, isLoading } = useSWR<BasinEnvelopeFile>(
    huc ? endpoints.basinEnvelope(huc) : null
  );
  const { data: season } = useSWR<ApiResponse<{ wyDay: number; swe: number }[]>>(
    huc ? endpoints.basinSeason(huc) : null
  );
  const data = useMemo((): BasinEnvelopeData | null => {
    if (!file) return null;
    return { ...toBasinEnvelope(file), currentSeason: season?.data ?? [], stationCount: file.stationCount };
  }, [file, season]);
  return {
    data,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
