"use client";

import useSWR from "swr";
import type { ApiResponse } from "@snotel/core/types";
import type { StationForecast } from "@snotel/core/forecast";
import { endpoints } from "@snotel/core/endpoints";

export function useForecast(triplet: string) {
  const { data, isLoading } = useSWR<ApiResponse<StationForecast>>(endpoints.stationForecast(triplet));
  return { forecast: data?.data ?? null, loading: isLoading && !data };
}
