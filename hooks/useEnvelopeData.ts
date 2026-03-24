"use client";

import useSWR from "swr";
import type { StationEnvelope } from "@/lib/types";
import { urlTriplet } from "@/lib/stations";

export function useEnvelopeData(triplet: string) {
  const { data, error, isLoading } = useSWR<StationEnvelope>(
    `/api/stations/${urlTriplet(triplet)}/envelope`
  );
  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
