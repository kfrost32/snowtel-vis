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
  sweChange7d: number | null;
  lastUpdated: string;
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
  apr1Swe: number | null;
  totalPrecip: number | null;
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
  };
  season: DailyObservation[];
}

export interface BasinSummary {
  huc: string;
  name: string;
  region: string;
  stationCount: number;
  medianPctOfNormal: number | null;
  avgSwe: number | null;
  stations: StationCurrentConditions[];
}

export type ConditionLevel =
  | "wellBelow"
  | "below"
  | "nearNormal"
  | "above"
  | "wellAbove";
