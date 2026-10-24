"use client";

import useSWR from "swr";
import { urlTriplet } from "@snotel/core/stations";
import type { ApiResponse, HourlyObservation } from "@snotel/core/types";

export type { HourlyObservation };

export function useHourlyData(triplet: string) {
  const { data, isLoading } = useSWR<ApiResponse<HourlyObservation[]>>(
    `/api/stations/${urlTriplet(triplet)}/hourly`
  );
  return {
    data: data?.data ?? [],
    loading: isLoading,
    fetchedAt: data?.fetchedAt ?? null,
    stale: data?.stale ?? false,
  };
}
