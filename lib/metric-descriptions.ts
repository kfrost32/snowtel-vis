export const metricDescriptions: Record<string, string> = {
  swe: "The amount of water contained in the snowpack, measured in inches. If you melted all the snow, this is how much water you'd have.",
  snowDepth: "Physical depth of snow on the ground. This is not the same as snowfall — snow compacts and settles, so depth changes reflect both new snow and compaction.",
  pctOfNormal: "How current SWE compares to the 1991–2020 median for this date. 100% means exactly average. Below 75% is concerning for water supply; above 125% is above-average snowpack.",
  density: "The ratio of water content (SWE) to snow depth. Lower density means lighter, drier powder. Higher density means heavier, wetter snow.",
  precip: "Total water-year precipitation since October 1, including both rain and melted snow.",
  temp: "Air temperature at the station. SNOTEL stations are in remote mountain locations, so temperatures may differ from nearby towns.",
};
