"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { StationEnvelope } from "@snotel/core/types";
import { expandEnvelope, type StationEnvelopeFile } from "@snotel/core/envelope-files";
import { urlTriplet } from "@snotel/core/stations";
import { calendarRowToWyDay, getCurrentWaterYear } from "@snotel/core/water-year";

export function useEnvelopeData(triplet: string) {
  const { data: file, error, isLoading } = useSWR<StationEnvelopeFile>(
    `/envelopes/stations/${urlTriplet(triplet)}.json`
  );
  const data = useMemo((): StationEnvelope | null => {
    if (!file) return null;
    const wy = getCurrentWaterYear();
    return {
      envelope: expandEnvelope(file.swe, wy),
      medianPeakDay: calendarRowToWyDay(file.swe.peakDay, wy),
      medianPeakRow: file.swe.peakDay,
      medianPeakSwe: file.swe.peak,
      depthEnvelope: expandEnvelope(file.depth, wy),
      medianPeakDepthDay: calendarRowToWyDay(file.depth.peakDay, wy),
      medianPeakDepth: file.depth.peak,
    };
  }, [file]);
  return {
    data,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
