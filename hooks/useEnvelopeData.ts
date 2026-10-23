"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { StationEnvelope } from "@/lib/types";
import { expandEnvelope, type StationEnvelopeFile } from "@/lib/envelope-files";
import { urlTriplet } from "@/lib/stations";

export function useEnvelopeData(triplet: string) {
  const { data: file, error, isLoading } = useSWR<StationEnvelopeFile>(
    `/envelopes/stations/${urlTriplet(triplet)}.json`
  );
  const data = useMemo((): StationEnvelope | null => {
    if (!file) return null;
    return {
      envelope: expandEnvelope(file.swe),
      medianPeakDay: file.swe.peakDay,
      medianPeakSwe: file.swe.peak,
      depthEnvelope: expandEnvelope(file.depth),
      medianPeakDepthDay: file.depth.peakDay,
      medianPeakDepth: file.depth.peak,
    };
  }, [file]);
  return {
    data,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
