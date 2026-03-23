"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Mountain } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { theme, yearColors, chartTooltipStyle, chartCursorStyle } from "@/lib/theme";
import { snowColors } from "@/lib/theme";
import { formatSwe, formatSnowDepth, formatPctOfNormal, formatTemp, formatElevation } from "@/lib/formatting";
import { urlTriplet, parseTripletFromUrl } from "@/lib/stations";
import { useStationList } from "@/hooks/useStationList";
import { useSeasonData } from "@/hooks/useSeasonData";
import type { StationSeasonData } from "@/lib/types";
import ChartCard from "@/components/ChartCard";
import ConditionBadge from "@/components/ConditionBadge";

const MAX_STATIONS = 5;

function StationDataLoader({
  triplet,
  onData,
}: {
  triplet: string;
  onData: (triplet: string, data: StationSeasonData | null, loading: boolean) => void;
}) {
  const { data, loading } = useSeasonData(triplet);

  useEffect(() => {
    onData(triplet, data, loading);
  }, [triplet, data, loading, onData]);

  return null;
}

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { stations: allStations, loading: stationsLoading } = useStationList();

  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [seasonDataMap, setSeasonDataMap] = useState<
    Record<string, { data: StationSeasonData | null; loading: boolean }>
  >({});

  const selectedTriplets = useMemo(() => {
    const param = searchParams.get("stations") || "";
    if (!param) return [];
    return param.split(",").map((t) => parseTripletFromUrl(t));
  }, [searchParams]);

  const updateUrl = useCallback(
    (triplets: string[]) => {
      const params = new URLSearchParams();
      if (triplets.length > 0) {
        params.set("stations", triplets.map((t) => urlTriplet(t)).join(","));
      }
      router.replace(`/compare?${params.toString()}`);
    },
    [router]
  );

  const addStation = useCallback(
    (triplet: string) => {
      if (selectedTriplets.includes(triplet) || selectedTriplets.length >= MAX_STATIONS) return;
      updateUrl([...selectedTriplets, triplet]);
      setSearch("");
      setShowDropdown(false);
    },
    [selectedTriplets, updateUrl]
  );

  const removeStation = useCallback(
    (triplet: string) => {
      updateUrl(selectedTriplets.filter((t) => t !== triplet));
      setSeasonDataMap((prev) => {
        const next = { ...prev };
        delete next[triplet];
        return next;
      });
    },
    [selectedTriplets, updateUrl]
  );

  const handleSeasonData = useCallback(
    (triplet: string, data: StationSeasonData | null, loading: boolean) => {
      setSeasonDataMap((prev) => {
        if (prev[triplet]?.data === data && prev[triplet]?.loading === loading) return prev;
        return { ...prev, [triplet]: { data, loading } };
      });
    },
    []
  );

  const searchResults = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return allStations
      .filter((s) => s.name.toLowerCase().includes(q) && !selectedTriplets.includes(s.triplet))
      .slice(0, 8);
  }, [allStations, search, selectedTriplets]);

  const selectedStationInfo = useMemo(() => {
    const map = new Map(allStations.map((s) => [s.triplet, s]));
    return selectedTriplets.map((t) => map.get(t)).filter(Boolean);
  }, [allStations, selectedTriplets]);

  const chartData = useMemo(() => {
    const allDates = new Map<string, Record<string, number | null>>();

    selectedTriplets.forEach((triplet) => {
      const entry = seasonDataMap[triplet];
      if (!entry?.data?.season) return;

      entry.data.season.forEach((obs) => {
        if (!allDates.has(obs.date)) {
          allDates.set(obs.date, {});
        }
        allDates.get(obs.date)![triplet] = obs.swe;
      });
    });

    return Array.from(allDates.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));
  }, [selectedTriplets, seasonDataMap]);

  const anyLoading = selectedTriplets.some((t) => seasonDataMap[t]?.loading !== false);

  return (
    <div style={{ background: theme.white }}>
      {selectedTriplets.map((triplet) => (
        <StationDataLoader key={triplet} triplet={triplet} onData={handleSeasonData} />
      ))}

      <div className="px-4 sm:px-6 pt-10 pb-6">
        <h1
          className="text-3xl sm:text-4xl font-semibold tracking-tighter font-sans mb-2"
          style={{ color: theme.black }}
        >
          Compare Stations
        </h1>
        <p className="font-mono text-sm max-w-2xl" style={{ color: theme.gray, lineHeight: 1.7 }}>
          Select up to {MAX_STATIONS} stations to compare conditions and season trends side by side.
        </p>
      </div>

      <div className="px-4 sm:px-6 pb-4">
        <div className="relative max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: theme.mediumGray }}
          />
          <input
            type="text"
            placeholder={
              selectedTriplets.length >= MAX_STATIONS
                ? `Maximum of ${MAX_STATIONS} stations`
                : "Search stations to add..."
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            disabled={selectedTriplets.length >= MAX_STATIONS}
            className="w-full pl-9 pr-3 py-2 rounded-lg border font-mono text-sm outline-none transition-colors focus:border-black/20 disabled:opacity-50"
            style={{ borderColor: theme.borderGray, color: theme.darkGray }}
          />
          {showDropdown && searchResults.length > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div
                className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border shadow-lg overflow-hidden max-h-[300px] overflow-y-auto"
                style={{ background: theme.white, borderColor: theme.borderGray }}
              >
                {searchResults.map((s) => (
                  <button
                    key={s.triplet}
                    onClick={() => addStation(s.triplet)}
                    className="w-full text-left px-4 py-2.5 hover:bg-black/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="font-sans text-sm font-medium" style={{ color: theme.darkGray }}>
                      {s.name}
                    </div>
                    <div className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>
                      {s.state} · {formatElevation(s.elevation)}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {selectedTriplets.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedStationInfo.map((s, i) => (
              <span
                key={s!.triplet}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full font-mono text-xs border"
                style={{ borderColor: theme.borderGray, color: theme.darkGray }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: yearColors[i % yearColors.length] }}
                />
                {s!.name}
                <button
                  onClick={() => removeStation(s!.triplet)}
                  className="p-0.5 rounded-full hover:bg-black/[0.05] transition-colors cursor-pointer"
                >
                  <X size={12} style={{ color: theme.mediumGray }} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {selectedTriplets.length === 0 && (
        <div
          className="mx-4 sm:mx-6 mb-12 p-12 rounded-lg border text-center"
          style={{ borderColor: theme.borderGray, background: theme.offWhite }}
        >
          <Mountain size={32} style={{ color: theme.borderGray }} className="mx-auto mb-3" />
          <p className="font-sans text-sm font-medium mb-1" style={{ color: theme.darkGray }}>
            No stations selected
          </p>
          <p className="font-mono text-xs" style={{ color: theme.gray }}>
            Search for stations above to start comparing snowpack data.
          </p>
        </div>
      )}

      {selectedTriplets.length > 0 && (
        <>
          <div className="px-4 sm:px-6 pb-8">
            <div className="overflow-x-auto touch-pan-x" style={{ WebkitOverflowScrolling: "touch" }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: theme.borderGray }}>
                    <th
                      className="py-3 text-left text-xs font-medium tracking-wider font-mono min-w-[100px]"
                      style={{ color: theme.gray }}
                    >
                      Metric
                    </th>
                    {selectedStationInfo.map((s, i) => (
                      <th
                        key={s!.triplet}
                        className="py-3 text-right text-xs font-medium tracking-wider font-mono min-w-[100px]"
                        style={{ color: yearColors[i % yearColors.length] }}
                      >
                        {s!.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "SWE",
                      getValue: (t: string) => {
                        const d = seasonDataMap[t]?.data;
                        return d ? formatSwe(d.current.swe) : "—";
                      },
                    },
                    {
                      label: "Snow Depth",
                      getValue: (t: string) => {
                        const d = seasonDataMap[t]?.data;
                        return d ? formatSnowDepth(d.current.snowDepth) : "—";
                      },
                    },
                    {
                      label: "% of Normal",
                      getValue: (t: string) => {
                        const d = seasonDataMap[t]?.data;
                        return d ? formatPctOfNormal(d.current.pctOfNormal) : "—";
                      },
                      renderExtra: (t: string) => {
                        const d = seasonDataMap[t]?.data;
                        if (!d) return null;
                        return <ConditionBadge pctOfNormal={d.current.pctOfNormal} size="small" />;
                      },
                    },
                    {
                      label: "Temperature",
                      getValue: (t: string) => {
                        const d = seasonDataMap[t]?.data;
                        return d ? formatTemp(d.current.temp) : "—";
                      },
                    },
                    {
                      label: "Elevation",
                      getValue: (t: string) => {
                        const s = selectedStationInfo.find((st) => st!.triplet === t);
                        return s ? formatElevation(s!.elevation) : "—";
                      },
                    },
                  ].map((row) => (
                    <tr
                      key={row.label}
                      className="border-b"
                      style={{ borderColor: theme.borderGray }}
                    >
                      <td
                        className="py-3 font-mono text-xs uppercase tracking-wide"
                        style={{ color: theme.gray }}
                      >
                        {row.label}
                      </td>
                      {selectedTriplets.map((t) => (
                        <td key={t} className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className="font-mono text-sm"
                              style={{ color: theme.darkGray }}
                            >
                              {seasonDataMap[t]?.loading ? "..." : row.getValue(t)}
                            </span>
                            {!seasonDataMap[t]?.loading &&
                              "renderExtra" in row &&
                              row.renderExtra?.(t)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-4 sm:px-6 pb-12">
            <ChartCard
              title="Season SWE Comparison"
              description="Snow water equivalent across the current water year"
              height={350}
            >
              {anyLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div
                    className="inline-block w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: snowColors.swe, borderTopColor: "transparent" }}
                  />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.borderGray} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fontFamily: "monospace", fill: theme.mediumGray }}
                      tickFormatter={(d: string) => {
                        const date = new Date(d + "T00:00:00");
                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                      interval="preserveStartEnd"
                      minTickGap={40}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fontFamily: "monospace", fill: theme.mediumGray }}
                      tickFormatter={(v: number) => `${v}″`}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      cursor={chartCursorStyle}
                      labelFormatter={(d) => {
                        const date = new Date(String(d) + "T00:00:00");
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                      formatter={(value) => [`${Number(value)?.toFixed(1)}″`, ""]}
                    />
                    <Legend
                      formatter={(value: string) => {
                        const s = selectedStationInfo.find((st) => st!.triplet === value);
                        return s ? s!.name : value;
                      }}
                      wrapperStyle={{ fontSize: 12, fontFamily: "monospace" }}
                    />
                    {selectedTriplets.map((triplet, i) => (
                      <Line
                        key={triplet}
                        type="monotone"
                        dataKey={triplet}
                        stroke={yearColors[i % yearColors.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        name={triplet}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div
                  className="h-full flex items-center justify-center font-mono text-sm"
                  style={{ color: theme.mediumGray }}
                >
                  No season data available
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div
              className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
              style={{ borderColor: snowColors.swe, borderTopColor: "transparent" }}
            />
            <p className="font-mono text-sm" style={{ color: theme.gray }}>
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
