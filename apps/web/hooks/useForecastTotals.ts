"use client";

import useSWR from "swr";
import type { ApiResponse } from "@snotel/core/types";
import type { ForecastTotals } from "@snotel/core/forecast";
import { RECENT_REFRESH_MS } from "@snotel/core/recent";
import { endpoints } from "@snotel/core/endpoints";

export function useForecastTotals() {
  const { data } = useSWR<ApiResponse<ForecastTotals>>(endpoints.stationsForecasts(), { refreshInterval: RECENT_REFRESH_MS });
  return data?.data ?? null;
}
