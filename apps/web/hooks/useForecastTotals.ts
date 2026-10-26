"use client";

import useSWR from "swr";
import type { ApiResponse } from "@snotel/core/types";
import type { ForecastTotals } from "@snotel/core/forecast";
import { endpoints } from "@snotel/core/endpoints";

const REFRESH_MS = 30 * 60 * 1000;

export function useForecastTotals() {
  const { data } = useSWR<ApiResponse<ForecastTotals>>(endpoints.stationsForecasts(), { refreshInterval: REFRESH_MS });
  return data?.data ?? null;
}
