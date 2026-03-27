"use client";

import useSWR from "swr";
import { urlTriplet } from "@/lib/stations";
import type { HourlyObservation } from "@/app/api/stations/[triplet]/hourly/route";
import type { ApiResponse } from "@/lib/api-cache";

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
