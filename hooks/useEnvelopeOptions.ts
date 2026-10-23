"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { compareYearColors } from "@/lib/theme";
import type { YearsFile } from "@/lib/envelope-files";
import { getCurrentWaterYear, rowsToWaterYear } from "@/lib/water-year";
import type { CompareYear } from "@/components/EnvelopeChart";

export const MAX_COMPARE_YEARS = compareYearColors.length;

const PERCENTILES_KEY = "snotel_show_percentiles";

export function useEnvelopeOptions(yearsUrl: string) {
  const [showPercentiles, setShowPercentiles] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(PERCENTILES_KEY) === "false") setShowPercentiles(false);
    } catch {}
  }, []);
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
    togglePercentiles: () => {
      const next = !showPercentiles;
      setShowPercentiles(next);
      try {
        localStorage.setItem(PERCENTILES_KEY, String(next));
      } catch {}
    },
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
