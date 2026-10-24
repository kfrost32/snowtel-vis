export const SNOTEL_STATES = [
  "AK", "AZ", "CA", "CO", "ID", "MT", "NV", "NM", "OR", "SD", "UT", "WA", "WY",
] as const;

export const STATE_NAMES: Record<string, string> = {
  AK: "Alaska",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  ID: "Idaho",
  MT: "Montana",
  NV: "Nevada",
  NM: "New Mexico",
  OR: "Oregon",
  SD: "South Dakota",
  UT: "Utah",
  WA: "Washington",
  WY: "Wyoming",
};

export const REGIONS: Record<string, { name: string; states: string[] }> = {
  pacificNW: { name: "Pacific Northwest", states: ["WA", "OR"] },
  sierra: { name: "Sierra Nevada", states: ["CA", "NV"] },
  rockiesNorth: { name: "Northern Rockies", states: ["MT", "ID"] },
  rockiesCentral: { name: "Central Rockies", states: ["WY", "CO", "UT"] },
  rockiesSouth: { name: "Southern Rockies", states: ["NM", "AZ"] },
  alaska: { name: "Alaska", states: ["AK"] },
  plains: { name: "Great Plains", states: ["SD"] },
};

export const ELEMENT_CODES = {
  WTEQ: "Snow Water Equivalent",
  SNWD: "Snow Depth",
  PREC: "Precipitation Accumulation",
  TMAX: "Air Temperature Maximum",
  TMIN: "Air Temperature Minimum",
  TAVG: "Air Temperature Average",
  TOBS: "Air Temperature Observed",
} as const;

export const REPORT_GENERATOR_BASE =
  "https://wcc.sc.egov.usda.gov/reportGenerator/view_csv";
