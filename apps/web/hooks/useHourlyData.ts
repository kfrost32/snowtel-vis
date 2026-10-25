"use client";

import useSWR from "swr";
import { endpoints } from "@snotel/core/endpoints";
import type { ApiResponse, HourlyObservation } from "@snotel/core/types";

export type { HourlyObservation };

export function useHourlyData(triplet: string) {
  const { data, isLoading } = useSWR<ApiResponse<HourlyObservation[]>>(
    endpoints.stationHourly(triplet)
  );
  return {
    data: data?.data ?? [],
    loading: isLoading,
    fetchedAt: data?.fetchedAt ?? null,
    stale: data?.stale ?? false,
  };
}
