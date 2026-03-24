export const metricDescriptions: Record<string, string> = {
  swe: "The amount of water contained in the snowpack, measured in inches. If you melted all the snow, this is how much water you'd have.",
  snowDepth: "Physical depth of snow on the ground. This is not the same as snowfall — snow compacts and settles, so depth changes reflect both new snow and compaction.",
  pctOfNormal: "How current SWE compares to the 1991–2020 median for this date. 100% means exactly average. Below 75% is concerning for water supply; above 125% is above-average snowpack.",
  newSnowDensity: "New snow density over the past 72 hours: (∆SWE ÷ ∆depth) × 100. Lower % means lighter, drier powder. Only shown when both ∆SWE > 0.2\" and ∆depth > 2\" — thresholds that filter out sensor noise and trace accumulation.",
  sweChange1d: "Change in SWE over the past 24 hours. Positive = accumulation, negative = melt.",
  sweChange7d: "Change in SWE over the past 7 days.",
  precip: "Total water-year precipitation since October 1, including both rain and melted snow.",
  temp: "Air temperature at the station. SNOTEL stations are in remote mountain locations, so temperatures may differ from nearby towns.",
};
