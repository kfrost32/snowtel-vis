"use client";

import useSWR from "swr";
import type { StationCurrentConditions } from "@/lib/types";
import type { ApiResponse } from "@/lib/api-cache";

const STALE_RETRY_MS = 15000;

export function useStationList() {
  const { data, error, isLoading } = useSWR<ApiResponse<StationCurrentConditions[]>>("/api/stations", {
    refreshInterval: (latest) => (latest?.stale ? STALE_RETRY_MS : 0),
  });
  return {
    stations: data?.data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    fetchedAt: data?.fetchedAt ?? null,
    stale: data?.stale ?? false,
  };
}
