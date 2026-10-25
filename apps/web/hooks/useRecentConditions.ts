"use client";

import useSWR from "swr";
import type { ApiResponse } from "@snotel/core/types";
import { RECENT_REFRESH_MS, type RecentConditions } from "@snotel/core/recent";
import { endpoints } from "@snotel/core/endpoints";

export function useRecentConditions() {
  const { data } = useSWR<ApiResponse<RecentConditions>>(endpoints.stationsRecent(), { refreshInterval: RECENT_REFRESH_MS });
  return data?.data ?? null;
}
