"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { WaterYearSummary } from "@snotel/core/types";
import type { StationEnvelopeFile } from "@snotel/core/envelope-files";
import { endpoints } from "@snotel/core/endpoints";
import { peakHistory } from "@snotel/core/station-stats";
import { useSeasonData } from "./useSeasonData";

export function useHistoricalData(triplet: string) {
  const { data: file, error, isLoading } = useSWR<StationEnvelopeFile>(
    endpoints.stationEnvelope(triplet)
  );
  const { data: season } = useSeasonData(triplet);
  const data = useMemo((): WaterYearSummary[] => (file ? peakHistory(file, season?.season ?? []) : []), [file, season]);
  return {
    data,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
