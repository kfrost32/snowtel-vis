"use client";

import useSWR from "swr";
import type { StationSeasonData } from "@/lib/types";
import { urlTriplet } from "@/lib/stations";

export function useSeasonData(triplet: string) {
  const { data, error, isLoading } = useSWR<StationSeasonData>(
    `/api/stations/${urlTriplet(triplet)}`
  );
  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
