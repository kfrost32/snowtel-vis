"use client";

import useSWR from "swr";
import type { StationCurrentConditions } from "@/lib/types";

export function useStationList() {
  const { data, error, isLoading } = useSWR<StationCurrentConditions[]>("/api/stations");
  return {
    stations: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
  };
}
