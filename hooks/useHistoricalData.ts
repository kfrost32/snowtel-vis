"use client";

import useSWR from "swr";
import type { WaterYearSummary } from "@/lib/types";
import { urlTriplet } from "@/lib/stations";

export function useHistoricalData(triplet: string) {
  const { data, error, isLoading } = useSWR<WaterYearSummary[]>(
    `/api/stations/${urlTriplet(triplet)}/historical`
  );
  return {
    data: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
  };
}
