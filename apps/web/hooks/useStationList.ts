"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { unpackReadings, type StationReadings } from "@snotel/core/readings";
import type { StationCurrentConditions } from "@snotel/core/types";
import type { ApiResponse } from "@snotel/core/types";
import { endpoints } from "@snotel/core/endpoints";

const STALE_RETRY_MS = 15000;

export function useStationList() {
  const { data, error, isLoading } = useSWR<ApiResponse<StationReadings>>(endpoints.stationReadings(), {
    refreshInterval: (latest) => (latest?.stale ? STALE_RETRY_MS : 0),
  });
  const stations = useMemo<StationCurrentConditions[]>(() => (data ? unpackReadings(data.data) : []), [data]);
  return {
    stations,
    loading: isLoading && !data,
    error: error?.message ?? null,
    fetchedAt: data?.fetchedAt ?? null,
    stale: data?.stale ?? false,
  };
}
