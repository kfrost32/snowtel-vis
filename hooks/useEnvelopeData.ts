"use client";

import useSWR from "swr";
import { urlTriplet } from "@/lib/stations";

interface EnvelopeDay {
  wyDay: number;
  min: number | null;
  max: number | null;
  median: number | null;
  p10: number | null;
  p90: number | null;
}

interface YearTrace {
  waterYear: number;
  data: { wyDay: number; swe: number }[];
}

export interface EnvelopeData {
  envelope: EnvelopeDay[];
  years: YearTrace[];
  currentYear: number;
}

export function useEnvelopeData(triplet: string) {
  const { data, error, isLoading } = useSWR<EnvelopeData>(
    `/api/stations/${urlTriplet(triplet)}/envelope`
  );
  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
