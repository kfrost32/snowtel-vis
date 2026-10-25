"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { StationEnvelopeFile } from "@snotel/core/envelope-files";
import { endpoints } from "@snotel/core/endpoints";
import { toStationEnvelope } from "@snotel/core/station-stats";

export function useEnvelopeData(triplet: string) {
  const { data: file, error, isLoading } = useSWR<StationEnvelopeFile>(
    endpoints.stationEnvelope(triplet)
  );
  const data = useMemo(() => (file ? toStationEnvelope(file) : null), [file]);
  return {
    data,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
