"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { theme, snowColors } from "@/lib/theme";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth } from "@/lib/formatting";
import { getConditionColor } from "@/lib/colors";
import { STATE_NAMES } from "@/lib/constants";
import { urlTriplet } from "@/lib/stations";
import { useStationList } from "@/hooks/useStationList";
import { computeBasinSummaries, median } from "@/lib/basins";
import type { BasinSummary, StationCurrentConditions } from "@/lib/types";
import Tabs from "@/components/Tabs";
import SortableTable from "@/components/SortableTable";
import type { Column } from "@/components/SortableTable";
import PercentOfNormalGauge from "@/components/PercentOfNormalGauge";
import ConditionBadge from "@/components/ConditionBadge";

const HUC_TABS = [
  { key: "2", label: "Major Basins (HUC-2)" },
  { key: "4", label: "Sub-Basins (HUC-4)" },
];

function BasinCard({
  basin,
  isSelected,
  onClick,
}: {
  basin: BasinSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg border flex flex-col items-center transition-all duration-150 cursor-pointer hover:shadow-sm text-center"
      style={{
        borderColor: isSelected ? theme.black : theme.borderGray,
        background: isSelected ? theme.lightGray : theme.offWhite,
        boxShadow: isSelected ? `0 0 0 1px ${theme.black}` : undefined,
      }}
    >
      <PercentOfNormalGauge value={basin.medianPctOfNormal} size={100} />
      <div
        className="mt-2 text-sm font-semibold font-sans"
        style={{ color: theme.black }}
      >
        {basin.name}
      </div>
      <div className="text-[11px] font-mono" style={{ color: theme.mediumGray }}>
        {basin.stationCount} stations
      </div>
    </button>
  );
}

const stationColumns: Column<StationCurrentConditions>[] = [
  {
    key: "name",
    label: "Station",
    defaultSortDir: "asc",
    className: "min-w-[160px]",
    getValue: (item) => item.name,
    render: (item) => (
      <div className="py-2.5">
        <div
          className="font-sans text-sm font-medium"
          style={{ color: theme.darkGray }}
        >
          {item.name}
        </div>
        <div className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>
          {STATE_NAMES[item.state] || item.state}
        </div>
      </div>
    ),
  },
  {
    key: "elevation",
    label: "Elev",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.elevation,
    render: (item) => (
      <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
        {formatElevation(item.elevation)}
      </span>
    ),
  },
  {
    key: "swe",
    label: "SWE",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.swe ?? -1,
    render: (item) => (
      <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
        {formatSwe(item.swe)}
      </span>
    ),
  },
  {
    key: "pctOfNormal",
    label: "% Normal",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.pctOfNormal ?? -1,
    render: (item) => (
      <div className="flex items-center justify-end gap-2">
        <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
          {formatPctOfNormal(item.pctOfNormal)}
        </span>
        <ConditionBadge pctOfNormal={item.pctOfNormal} size="small" />
      </div>
    ),
  },
  {
    key: "snowDepth",
    label: "Depth",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.snowDepth ?? -1,
    render: (item) => (
      <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
        {formatSnowDepth(item.snowDepth)}
      </span>
    ),
  },
];

const basinColumns: Column<BasinSummary>[] = [
  {
    key: "name",
    label: "Basin",
    defaultSortDir: "asc",
    className: "min-w-[180px]",
    getValue: (item) => item.name,
    render: (item) => (
      <div className="py-2.5">
        <div
          className="font-sans text-sm font-medium"
          style={{ color: theme.darkGray }}
        >
          {item.name}
        </div>
        <div className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>
          {item.region}
        </div>
      </div>
    ),
  },
  {
    key: "stationCount",
    label: "Stations",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.stationCount,
    render: (item) => (
      <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
        {item.stationCount}
      </span>
    ),
  },
  {
    key: "medianPctOfNormal",
    label: "% Normal",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.medianPctOfNormal ?? -1,
    render: (item) => (
      <div className="flex items-center justify-end gap-2">
        <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
          {formatPctOfNormal(item.medianPctOfNormal)}
        </span>
        <ConditionBadge pctOfNormal={item.medianPctOfNormal} size="small" />
      </div>
    ),
  },
  {
    key: "avgSwe",
    label: "Avg SWE",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.avgSwe ?? -1,
    render: (item) => (
      <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
        {formatSwe(item.avgSwe)}
      </span>
    ),
  },
];

export default function BasinsPage() {
  const { stations, loading } = useStationList();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hucLevel, setHucLevel] = useState<string>(
    searchParams.get("level") || "2"
  );

  const selectedBasinHuc = searchParams.get("basin");

  const basins = useMemo(
    () => computeBasinSummaries(stations, (Number(hucLevel) as 2 | 4)),
    [stations, hucLevel]
  );

  const selectedBasin = useMemo(
    () => basins.find((b) => b.huc === selectedBasinHuc) || null,
    [basins, selectedBasinHuc]
  );

  const overallMedian = useMemo(() => {
    const values = basins
      .filter((b) => b.medianPctOfNormal !== null)
      .map((b) => b.medianPctOfNormal!);
    return values.length > 0 ? Math.round(median(values)) : null;
  }, [basins]);

  const selectBasin = (huc: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedBasinHuc === huc) {
      params.delete("basin");
    } else {
      params.set("basin", huc);
    }
    router.push(`/basins?${params.toString()}`, { scroll: false });
  };

  const clearSelection = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("basin");
    router.push(`/basins?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (key: string) => {
    setHucLevel(key);
    const params = new URLSearchParams();
    params.set("level", key);
    router.push(`/basins?${params.toString()}`, { scroll: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
            style={{
              borderColor: snowColors.swe,
              borderTopColor: "transparent",
            }}
          />
          <p className="font-mono text-sm" style={{ color: theme.gray }}>
            Loading basin data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: theme.white }}>
      <div className="px-4 sm:px-6 pt-10 pb-6">
        <h1
          className="text-3xl sm:text-4xl font-semibold tracking-tighter font-sans mb-2"
          style={{ color: theme.black }}
        >
          Basin Conditions
        </h1>
        <p
          className="font-mono text-sm max-w-2xl"
          style={{ color: theme.gray, lineHeight: 1.7 }}
        >
          Snowpack conditions aggregated by USGS hydrologic unit. Select a basin
          to see individual station conditions.
        </p>
      </div>

      <Tabs tabs={HUC_TABS} activeTab={hucLevel} onChange={handleTabChange} />

      <div
        className="px-4 sm:px-6 py-3 flex items-center gap-4 border-b"
        style={{ borderColor: theme.borderGray, background: theme.offWhite }}
      >
        <span className="font-mono text-xs" style={{ color: theme.gray }}>
          <strong style={{ color: theme.darkGray }}>{basins.length}</strong>{" "}
          basins
        </span>
        {overallMedian !== null && (
          <span className="font-mono text-xs" style={{ color: theme.gray }}>
            Median:{" "}
            <strong style={{ color: getConditionColor(overallMedian) }}>
              {formatPctOfNormal(overallMedian)}
            </strong>{" "}
            of normal
          </span>
        )}
      </div>

      <div className="px-4 sm:px-6 py-6">
        {hucLevel === "2" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {basins.map((basin) => (
              <BasinCard
                key={basin.huc}
                basin={basin}
                isSelected={selectedBasinHuc === basin.huc}
                onClick={() => selectBasin(basin.huc)}
              />
            ))}
          </div>
        ) : (
          <SortableTable
            data={basins}
            columns={basinColumns}
            getHref={(item) =>
              `/basins?level=${hucLevel}&basin=${item.huc}`
            }
            getKey={(item) => item.huc}
            defaultSortKey="medianPctOfNormal"
            defaultSortDir="desc"
          />
        )}
      </div>

      {selectedBasin && (
        <div
          className="border-t"
          style={{ borderColor: theme.borderGray }}
        >
          <div className="px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2
                    className="text-xl font-semibold tracking-tight font-sans"
                    style={{ color: theme.black }}
                  >
                    {selectedBasin.name}
                  </h2>
                  <ConditionBadge
                    pctOfNormal={selectedBasin.medianPctOfNormal}
                    size="small"
                  />
                </div>
                <p
                  className="font-mono text-xs mt-1"
                  style={{ color: theme.mediumGray }}
                >
                  {selectedBasin.stationCount} stations ·{" "}
                  {selectedBasin.region && `${selectedBasin.region} · `}
                  Median {formatPctOfNormal(selectedBasin.medianPctOfNormal)} of
                  normal
                  {selectedBasin.avgSwe !== null &&
                    ` · Avg SWE ${formatSwe(selectedBasin.avgSwe)}`}
                </p>
              </div>
              <button
                onClick={clearSelection}
                className="p-1.5 rounded-md hover:bg-black/[0.05] transition-colors cursor-pointer"
                style={{ color: theme.gray }}
                aria-label="Close basin detail"
              >
                <X size={18} />
              </button>
            </div>

            <SortableTable
              data={selectedBasin.stations}
              columns={stationColumns}
              getHref={(item) => `/station/${urlTriplet(item.triplet)}`}
              getKey={(item) => item.triplet}
              defaultSortKey="pctOfNormal"
              defaultSortDir="desc"
            />
          </div>
        </div>
      )}
    </div>
  );
}
