"use client";

import { Suspense, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { theme } from "@/lib/theme";
import { formatSwe, formatPctOfNormal } from "@snotel/core/formatting";
import { getConditionColor } from "@snotel/core/colors";
import { useStationList } from "@/hooks/useStationList";
import { basinPath, computeBasinSummaries, median } from "@snotel/core/basins";
import type { BasinSummary } from "@snotel/core/types";
import Tabs from "@/components/Tabs";
import SortableTable from "@/components/SortableTable";
import type { Column } from "@/components/SortableTable";
import PercentOfNormalGauge from "@/components/PercentOfNormalGauge";
import ConditionBadge from "@/components/ConditionBadge";
import LoadingSpinner from "@/components/LoadingSpinner";

const HUC_TABS = [
  { key: "2", label: "Major Basins (HUC-2)" },
  { key: "4", label: "Sub-Basins (HUC-4)" },
];

function BasinCard({ basin }: { basin: BasinSummary }) {
  return (
    <Link
      href={basinPath(basin.huc)}
      className="p-4 rounded-lg border flex flex-col items-center transition-all duration-150 hover:shadow-sm text-center"
      style={{ borderColor: theme.borderGray, background: theme.white }}
    >
      <PercentOfNormalGauge value={basin.medianPctOfNormal} size={112} />
      <div className="mt-2 text-sm font-semibold font-sans" style={{ color: theme.black }}>
        {basin.name}
      </div>
      <div className="text-xs font-mono" style={{ color: theme.mediumGray }}>
        {basin.stationCount} stations
      </div>
    </Link>
  );
}

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
        <div className="font-mono text-xs" style={{ color: theme.mediumGray }}>
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
    label: "% Median",
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
  return (
    <Suspense fallback={<LoadingSpinner message="Loading basin data..." fullScreen />}>
      <BasinsPageInner />
    </Suspense>
  );
}

function BasinsPageInner() {
  const { stations, loading } = useStationList();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hucLevel, setHucLevel] = useState<string>(
    searchParams.get("level") || "2"
  );

  const basins = useMemo(
    () => computeBasinSummaries(stations, (Number(hucLevel) as 2 | 4)),
    [stations, hucLevel]
  );

  const overallMedian = useMemo(() => {
    const values = basins
      .filter((b) => b.medianPctOfNormal !== null)
      .map((b) => b.medianPctOfNormal!);
    return values.length > 0 ? Math.round(median(values)) : null;
  }, [basins]);

  const handleTabChange = (key: string) => {
    setHucLevel(key);
    const params = new URLSearchParams();
    params.set("level", key);
    router.push(`/basins?${params.toString()}`, { scroll: false });
  };

  if (loading) {
    return <LoadingSpinner message="Loading basin data..." fullScreen />;
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: theme.offWhite }}>
      <div className="mx-auto max-w-3xl">
      <div className="pb-6">
        <h1
          className="text-2xl font-semibold tracking-tight font-sans mb-2"
          style={{ color: theme.black }}
        >
          Basin conditions
        </h1>
        <p
          className="font-sans text-sm max-w-2xl"
          style={{ color: theme.gray }}
        >
          Snowpack conditions aggregated by USGS hydrologic unit. Select a basin
          to see its stations.
        </p>
      </div>

      <Tabs tabs={HUC_TABS} activeTab={hucLevel} onChange={handleTabChange} />

      <div
        className="py-3 flex items-center gap-4"
      >
        <span className="font-mono text-xs" style={{ color: theme.gray }}>
          <strong style={{ color: theme.darkGray }}>{basins.length}</strong>{" "}
          basins
        </span>
        {overallMedian !== null && (
          <span className="font-mono text-xs" style={{ color: theme.gray }}>
            Overall:{" "}
            <strong style={{ color: getConditionColor(overallMedian) }}>
              {formatPctOfNormal(overallMedian)}
            </strong>{" "}
            of median
          </span>
        )}
      </div>

      <div className="pt-1">
        {hucLevel === "2" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {basins.map((basin) => (
              <BasinCard key={basin.huc} basin={basin} />
            ))}
          </div>
        ) : (
          <SortableTable
            data={basins}
            columns={basinColumns}
            getHref={(item) => basinPath(item.huc)}
            getKey={(item) => item.huc}
            defaultSortKey="medianPctOfNormal"
            defaultSortDir="desc"
          />
        )}
      </div>

      </div>
    </div>
  );
}
