"use client";

import useSWR from "swr";
import type { EnvelopeData } from "@/hooks/useEnvelopeData";

export function useBasinEnvelopeData(huc: string) {
  const { data, error, isLoading } = useSWR<EnvelopeData>(
    `/api/basins/${encodeURIComponent(huc)}/envelope`
  );
  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
