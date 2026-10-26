"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { compareYearColors } from "@/lib/theme";
import type { YearsFile } from "@snotel/core/envelope-files";
import { getCurrentWaterYear, rowsToWaterYear } from "@snotel/core/water-year";
import type { CompareYear } from "@/components/EnvelopeChart";
import { storedValue, useStoredValue } from "@/lib/stored-value";

export const MAX_COMPARE_YEARS = compareYearColors.length;

const PERCENTILES_KEY = "snotel_show_percentiles";
const percentilesStore = storedValue(PERCENTILES_KEY, true, (raw) => raw !== "false");

export function useEnvelopeOptions(yearsUrl: string) {
  const showPercentiles = useStoredValue(percentilesStore);
  const [selectedYears, setSelectedYears] = useState<{ year: number; color: string }[]>([]);
  const { data: file } = useSWR<YearsFile>(yearsUrl);

  const compareYears = useMemo((): CompareYear[] => {
    if (!file) return [];
    return selectedYears
      .filter(({ year }) => file.years[year])
      .map(({ year, color }) => ({ year, color, values: rowsToWaterYear(file.years[year], getCurrentWaterYear()) }));
  }, [file, selectedYears]);

  return {
    showPercentiles,
    togglePercentiles: () => percentilesStore.set((show) => !show),
    selectedYears,
    addYear: (year: number) =>
      setSelectedYears((ys) => {
        if (ys.some((y) => y.year === year) || ys.length >= MAX_COMPARE_YEARS) return ys;
        const color = compareYearColors.find((c) => !ys.some((y) => y.color === c))!;
        return [...ys, { year, color }];
      }),
    removeYear: (year: number) => setSelectedYears((ys) => ys.filter((y) => y.year !== year)),
    clearYears: () => setSelectedYears([]),
    compareYears,
    yearsFile: file ?? null,
  };
}
