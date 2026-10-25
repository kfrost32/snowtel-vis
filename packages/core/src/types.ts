export interface Station {
  triplet: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  elevation: number;
  huc: string;
  beginDate: string;
  network: string;
}

export interface StationCurrentConditions extends Station {
  swe: number | null;
  sweNormal: number | null;
  pctOfNormal: number | null;
  snowDepth: number | null;
  temp: number | null;
  precipAccum: number | null;
  sweChange1d: number | null;
  sweChange3d: number | null;
  sweChange7d: number | null;
  depthChange1d: number | null;
  depthChange3d: number | null;
  depthChange7d: number | null;
  lastUpdated: string;
  depthAt?: string | null;
}

export interface DailyObservation {
  date: string;
  swe: number | null;
  sweMedian: number | null;
  snowDepth: number | null;
  precip: number | null;
  tmax: number | null;
  tmin: number | null;
  tavg: number | null;
}

export interface WaterYearSummary {
  waterYear: number;
  peakSwe: number;
  peakSweDate: string;
}

export interface StationSeasonData {
  station: Station;
  current: {
    swe: number | null;
    sweNormal: number | null;
    pctOfNormal: number | null;
    snowDepth: number | null;
    temp: number | null;
    precipAccum: number | null;
    lastUpdated: string | null;
  };
  season: DailyObservation[];
}

export interface BasinSummary {
  huc: string;
  name: string;
  region: string;
  stationCount: number;
  medianPctOfNormal: number | null;
  indexStationCount: number;
  asOf: string | null;
  avgSwe: number | null;
  stations: StationCurrentConditions[];
}

export interface EnvelopeDay {
  wyDay: number;
  max: number | null;
  min: number | null;
  median: number | null;
  maxYear?: number | null;
  minYear?: number | null;
  p10?: number | null;
  p30?: number | null;
  p70?: number | null;
  p90?: number | null;
}

export interface StationEnvelope {
  envelope: EnvelopeDay[];
  medianPeakDay: number;
  medianPeakRow: number;
  medianPeakSwe: number;
  depthEnvelope: EnvelopeDay[];
  medianPeakDepthDay: number;
  medianPeakDepth: number;
}

export type ConditionLevel =
  | "wellBelow"
  | "below"
  | "nearNormal"
  | "above"
  | "wellAbove";

export interface HourlyObservation {
  datetime: string;
  snowDepth: number | null;
  temp: number | null;
}

export interface ApiResponse<T> {
  data: T;
  fetchedAt: number;
  stale: boolean;
}
