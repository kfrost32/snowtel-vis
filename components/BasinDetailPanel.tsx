"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { theme } from "@/lib/theme";
import { formatSwe, formatPctOfNormal } from "@/lib/formatting";
import { getConditionColor } from "@/lib/colors";
import type { BasinSummary } from "@/lib/types";
import PercentOfNormalGauge from "@/components/PercentOfNormalGauge";
import ConditionBadge from "@/components/ConditionBadge";

interface BasinDetailPanelProps {
  basin: BasinSummary;
  onClose: () => void;
  onStationClick: (triplet: string) => void;
}

export default function BasinDetailPanel({
  basin,
  onClose,
  onStationClick,
}: BasinDetailPanelProps) {
  const sortedStations = useMemo(
    () =>
      [...basin.stations].sort(
        (a, b) => (b.pctOfNormal ?? -1) - (a.pctOfNormal ?? -1)
      ),
    [basin.stations]
  );

  return (
    <div
      className="h-full flex flex-col overflow-y-auto"
      style={{ background: theme.white }}
    >
      <div
        className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b"
        style={{ borderColor: theme.borderGray }}
      >
        <div className="min-w-0">
          <h2
            className="text-lg font-semibold tracking-tight font-sans leading-snug"
            style={{ color: theme.black }}
          >
            {basin.name}
          </h2>
          {basin.region && (
            <p
              className="font-mono text-[11px] mt-0.5"
              style={{ color: theme.mediumGray }}
            >
              {basin.region}
            </p>
          )}
          <p
            className="font-mono text-[11px] mt-0.5"
            style={{ color: theme.mediumGray }}
          >
            {basin.stationCount} station{basin.stationCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-black/[0.05] transition-colors cursor-pointer shrink-0"
          style={{ color: theme.gray }}
          aria-label="Close basin detail"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex justify-center py-5">
        <PercentOfNormalGauge value={basin.medianPctOfNormal} size={140} />
      </div>

      <div
        className="grid grid-cols-3 gap-px mx-5 mb-5 rounded-lg overflow-hidden border"
        style={{ borderColor: theme.borderGray }}
      >
        {[
          { label: "Stations", value: String(basin.stationCount) },
          { label: "Avg SWE", value: formatSwe(basin.avgSwe) },
          {
            label: "Basin Index",
            value: formatPctOfNormal(basin.medianPctOfNormal),
            color: getConditionColor(basin.medianPctOfNormal),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center py-3"
            style={{ background: theme.offWhite }}
          >
            <span
              className="font-sans text-lg font-semibold"
              style={{ color: stat.color ?? theme.darkGray }}
            >
              {stat.value}
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{ color: theme.mediumGray }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <div
        className="px-5 py-2.5 border-t border-b"
        style={{
          borderColor: theme.borderGray,
          background: theme.offWhite,
        }}
      >
        <span
          className="font-mono text-[11px] uppercase tracking-wider"
          style={{ color: theme.gray }}
        >
          Stations
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sortedStations.map((station) => (
          <button
            key={station.triplet}
            onClick={() => onStationClick(station.triplet)}
            className="w-full flex items-center justify-between gap-3 px-5 py-3 border-b transition-colors hover:bg-black/[0.02] cursor-pointer text-left"
            style={{ borderColor: theme.borderGray }}
          >
            <div className="min-w-0">
              <div
                className="font-sans text-sm font-medium truncate"
                style={{ color: theme.darkGray }}
              >
                {station.name}
              </div>
              <div
                className="font-mono text-[11px]"
                style={{ color: theme.mediumGray }}
              >
                {station.state}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="text-right">
                <div
                  className="font-mono text-sm"
                  style={{ color: theme.darkGray }}
                >
                  {formatSwe(station.swe)}
                </div>
                <div
                  className="font-mono text-[11px]"
                  style={{ color: theme.mediumGray }}
                >
                  {formatPctOfNormal(station.pctOfNormal)}
                </div>
              </div>
              <ConditionBadge pctOfNormal={station.pctOfNormal} size="small" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
