import { useMemo } from "react";
import useSWR from "swr";
import { endpoints } from "@snotel/core/endpoints";
import { getStation, hasNwsForecast } from "@snotel/core/stations";
import { unpackReadings, type StationReadings } from "@snotel/core/readings";
import type { ForecastTotals, StationForecast } from "@snotel/core/forecast";
import { basinSeasonMap, peakHistory, toBasinEnvelope, toStationEnvelope } from "@snotel/core/station-stats";
import { applyRecentDepth, RECENT_REFRESH_MS, stationDepth, type RecentConditions } from "@snotel/core/recent";
import type { BasinEnvelopeFile, StationEnvelopeFile, YearsFile } from "@snotel/core/envelope-files";
import type { ApiResponse, HourlyObservation, StationSeasonData } from "@snotel/core/types";

const STALE_RETRY_MS = 15000;

export function useStationList() {
  const { data, isLoading } = useSWR<ApiResponse<StationReadings>>(endpoints.stationReadings(), {
    refreshInterval: (latest) => (latest?.stale ? STALE_RETRY_MS : RECENT_REFRESH_MS),
  });
  const stations = useMemo(() => (data ? unpackReadings(data.data) : null), [data]);
  return { stations, loading: isLoading, stale: data?.stale ?? false };
}

export function useRecentConditions() {
  const { data } = useSWR<ApiResponse<RecentConditions>>(endpoints.stationsRecent(), { refreshInterval: RECENT_REFRESH_MS });
  return data?.data ?? null;
}

export function useStationConditions(triplet: string) {
  const { stations } = useStationList();
  const recent = useRecentConditions();
  const hourly = useStationHourly(triplet);
  return useMemo(() => {
    const station = stations?.find((s) => s.triplet === triplet);
    return station ? applyRecentDepth(station, stationDepth(recent?.stations[triplet], hourly)) : null;
  }, [stations, recent, hourly, triplet]);
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

export function useForecastTotals() {
  const { data } = useSWR<ApiResponse<ForecastTotals>>(endpoints.stationsForecasts(), { refreshInterval: RECENT_REFRESH_MS });
  return data?.data ?? null;
}

export function useStationForecast(triplet: string) {
  const { data, error } = useSWR<ApiResponse<StationForecast>>(hasNwsForecast(getStation(triplet)) ? endpoints.stationForecast(triplet) : null);
  return { forecast: data?.data ?? null, unavailable: Boolean(error) && !data };
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
