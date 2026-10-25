import { useMemo } from "react";
import useSWR from "swr";
import { endpoints } from "@snotel/core/endpoints";
import { basinSeasonMap, peakHistory, toBasinEnvelope, toStationEnvelope } from "@snotel/core/station-stats";
import type { BasinEnvelopeFile, StationEnvelopeFile, YearsFile } from "@snotel/core/envelope-files";
import type { ApiResponse, HourlyObservation, StationCurrentConditions, StationSeasonData } from "@snotel/core/types";

const STALE_RETRY_MS = 15000;

export function useStationList() {
  const { data, isLoading } = useSWR<ApiResponse<StationCurrentConditions[]>>(endpoints.stations(), {
    refreshInterval: (latest) => (latest?.stale ? STALE_RETRY_MS : 0),
  });
  return { stations: data?.data ?? null, loading: isLoading, stale: data?.stale ?? false };
}

export function useStationConditions(triplet: string) {
  const { stations } = useStationList();
  return useMemo(() => stations?.find((s) => s.triplet === triplet) ?? null, [stations, triplet]);
}

export function useStationDetail(triplet: string) {
  const season = useSWR<ApiResponse<StationSeasonData>>(endpoints.stationSeason(triplet));
  const envelopeFile = useSWR<StationEnvelopeFile>(endpoints.stationEnvelope(triplet));
  const years = useSWR<YearsFile>(endpoints.stationYears(triplet));
  const envelope = useMemo(() => (envelopeFile.data ? toStationEnvelope(envelopeFile.data) : null), [envelopeFile.data]);
  const peaks = useMemo(
    () => (envelopeFile.data ? peakHistory(envelopeFile.data, season.data?.data.season ?? []) : []),
    [envelopeFile.data, season.data]
  );
  return {
    season: season.data?.data ?? null,
    envelope,
    years: years.data ?? null,
    peaks,
    loading: season.isLoading || envelopeFile.isLoading,
    refresh: () => Promise.all([season.mutate(), envelopeFile.mutate()]),
  };
}

export function useStationHourly(triplet: string) {
  const { data } = useSWR<ApiResponse<HourlyObservation[]>>(endpoints.stationHourly(triplet));
  return data?.data ?? null;
}

export function useRegionDetail(huc: string) {
  const file = useSWR<BasinEnvelopeFile>(endpoints.basinEnvelope(huc));
  const season = useSWR<ApiResponse<{ wyDay: number; swe: number }[]>>(endpoints.basinSeason(huc));
  const years = useSWR<YearsFile>(endpoints.basinYears(huc));
  const envelope = useMemo(() => (file.data ? toBasinEnvelope(file.data) : null), [file.data]);
  const seasonMap = useMemo(() => basinSeasonMap(season.data?.data ?? []), [season.data]);
  return { envelope, seasonMap, years: years.data ?? null, loading: file.isLoading };
}
