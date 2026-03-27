"use client";

import useSWR from "swr";
import type { StationCurrentConditions } from "@/lib/types";
import type { ApiResponse } from "@/lib/api-cache";

export function useStationList() {
  const { data, error, isLoading } = useSWR<ApiResponse<StationCurrentConditions[]>>("/api/stations");
  return {
    stations: data?.data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    fetchedAt: data?.fetchedAt ?? null,
    stale: data?.stale ?? false,
  };
}
