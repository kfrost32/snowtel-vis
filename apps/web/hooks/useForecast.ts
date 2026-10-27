"use client";

import useSWR from "swr";
import type { ApiResponse } from "@snotel/core/types";
import type { StationForecast } from "@snotel/core/forecast";
import { endpoints } from "@snotel/core/endpoints";
import { getStation, hasNwsForecast } from "@snotel/core/stations";

export function useForecast(triplet: string) {
  const { data, isLoading } = useSWR<ApiResponse<StationForecast>>(hasNwsForecast(getStation(triplet)) ? endpoints.stationForecast(triplet) : null);
  return { forecast: data?.data ?? null, loading: isLoading && !data };
}
