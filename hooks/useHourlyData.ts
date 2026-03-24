"use client";

import useSWR from "swr";
import { urlTriplet } from "@/lib/stations";
import type { HourlyObservation } from "@/app/api/stations/[triplet]/hourly/route";

export type { HourlyObservation };

export function useHourlyData(triplet: string) {
  const { data, isLoading } = useSWR<HourlyObservation[]>(
    `/api/stations/${urlTriplet(triplet)}/hourly`
  );
  return {
    data: data ?? [],
    loading: isLoading,
  };
}
