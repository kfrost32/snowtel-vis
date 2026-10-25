"use client";

import useSWR from "swr";
import type { StationCurrentConditions } from "@snotel/core/types";
import type { ApiResponse } from "@snotel/core/types";
import { endpoints } from "@snotel/core/endpoints";

const STALE_RETRY_MS = 15000;

export function useStationList() {
  const { data, error, isLoading } = useSWR<ApiResponse<StationCurrentConditions[]>>(endpoints.stations(), {
    refreshInterval: (latest) => (latest?.stale ? STALE_RETRY_MS : 0),
  });
  return {
    stations: data?.data ?? [],
    loading: isLoading && !data,
    error: error?.message ?? null,
    fetchedAt: data?.fetchedAt ?? null,
    stale: data?.stale ?? false,
  };
}
