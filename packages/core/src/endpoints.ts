import { urlTriplet } from "./stations";

export const endpoints = {
  stations: () => "/api/stations",
  stationReadings: () => "/api/stations/readings",
  stationsRecent: () => "/api/stations/recent",
  stationSeason: (triplet: string) => `/api/stations/${urlTriplet(triplet)}`,
  stationHourly: (triplet: string) => `/api/stations/${urlTriplet(triplet)}/hourly`,
  stationEnvelope: (triplet: string) => `/envelopes/stations/${urlTriplet(triplet)}.json`,
  stationYears: (triplet: string) => `/envelopes/years/stations/${urlTriplet(triplet)}.json`,
  basinSeason: (huc: string) => `/api/basins/${huc}/season`,
  basinEnvelope: (huc: string) => `/envelopes/basins/${huc}.json`,
  basinYears: (huc: string) => `/envelopes/years/basins/${huc}.json`,
};
