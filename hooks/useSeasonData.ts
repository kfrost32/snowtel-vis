"use client";

import useSWR from "swr";
import type { StationSeasonData } from "@/lib/types";
import type { ApiResponse } from "@/lib/api-cache";
import { urlTriplet } from "@/lib/stations";

export function useSeasonData(triplet: string) {
  const { data, error, isLoading } = useSWR<ApiResponse<StationSeasonData>>(
    `/api/stations/${urlTriplet(triplet)}`
  );
  return {
    data: data?.data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    fetchedAt: data?.fetchedAt ?? null,
    stale: data?.stale ?? false,
  };
}
