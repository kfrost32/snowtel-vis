"use client";

import useSWR from "swr";
import type { WaterYearSummary } from "@/lib/types";
import type { ApiResponse } from "@/lib/api-cache";
import { urlTriplet } from "@/lib/stations";

export function useHistoricalData(triplet: string) {
  const { data, error, isLoading } = useSWR<ApiResponse<WaterYearSummary[]>>(
    `/api/stations/${urlTriplet(triplet)}/historical`
  );
  return {
    data: data?.data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    fetchedAt: data?.fetchedAt ?? null,
    stale: data?.stale ?? false,
  };
}
