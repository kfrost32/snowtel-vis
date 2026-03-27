"use client";

import useSWR from "swr";
import type { StationEnvelope } from "@/lib/types";
import type { ApiResponse } from "@/lib/api-cache";
import { urlTriplet } from "@/lib/stations";

export function useEnvelopeData(triplet: string) {
  const { data, error, isLoading } = useSWR<ApiResponse<StationEnvelope>>(
    `/api/stations/${urlTriplet(triplet)}/envelope`
  );
  return {
    data: data?.data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    fetchedAt: data?.fetchedAt ?? null,
    stale: data?.stale ?? false,
  };
}
