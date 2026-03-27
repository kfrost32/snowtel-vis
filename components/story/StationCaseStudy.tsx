"use client";

import { useMemo } from "react";
import { theme } from "@/lib/theme";
import { formatElevation, formatPctOfNormal, formatSwe } from "@/lib/formatting";
import { useSeasonData } from "@/hooks/useSeasonData";
import { STATE_NAMES } from "@/lib/constants";
import PercentOfNormalGauge from "@/components/PercentOfNormalGauge";
import ConditionBadge from "@/components/ConditionBadge";
import SeasonChart from "@/components/SeasonChart";
import type { StationCurrentConditions } from "@/lib/types";

interface StationCaseStudyProps {
  station: StationCurrentConditions;
}

export default function StationCaseStudy({ station }: StationCaseStudyProps) {
  const { data, loading } = useSeasonData(station.triplet);

  const season = useMemo(() => data?.season ?? [], [data]);

  return (
    <div
      className="p-4 sm:p-6 rounded-lg border"
      style={{ background: theme.white, borderColor: theme.borderGray }}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-sans font-semibold text-base truncate" style={{ color: theme.black }}>
            {station.name}
          </h4>
          <div className="font-mono text-[11px] mt-0.5" style={{ color: theme.gray }}>
            {STATE_NAMES[station.state] || station.state} · {formatElevation(station.elevation)}
          </div>
          <div className="mt-2">
            <ConditionBadge pctOfNormal={station.pctOfNormal} size="small" />
          </div>
        </div>
        <PercentOfNormalGauge value={station.pctOfNormal} size={72} />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wide" style={{ color: theme.mediumGray }}>
            Current SWE
          </div>
          <div className="font-sans font-semibold text-sm" style={{ color: theme.black }}>
            {formatSwe(station.swe)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wide" style={{ color: theme.mediumGray }}>
            Normal
          </div>
          <div className="font-sans font-semibold text-sm" style={{ color: theme.black }}>
            {formatSwe(station.sweNormal)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wide" style={{ color: theme.mediumGray }}>
            % of Median
          </div>
          <div className="font-sans font-semibold text-sm" style={{ color: theme.black }}>
            {formatPctOfNormal(station.pctOfNormal)}
          </div>
        </div>
      </div>
      <div style={{ height: 180 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full font-mono text-xs" style={{ color: theme.mediumGray }}>
            Loading season data...
          </div>
        ) : season.length > 0 ? (
          <SeasonChart season={season} />
        ) : (
          <div className="flex items-center justify-center h-full font-mono text-xs" style={{ color: theme.mediumGray }}>
            No season data
          </div>
        )}
      </div>
    </div>
  );
}
