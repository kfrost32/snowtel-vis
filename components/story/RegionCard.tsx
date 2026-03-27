"use client";

import { theme } from "@/lib/theme";
import PercentOfNormalGauge from "@/components/PercentOfNormalGauge";
import ConditionBadge from "@/components/ConditionBadge";

interface RegionCardProps {
  name: string;
  pctOfNormal: number | null;
  stationCount: number;
  belowNormalCount: number;
}

export default function RegionCard({ name, pctOfNormal, stationCount, belowNormalCount }: RegionCardProps) {
  return (
    <div
      className="p-4 sm:p-5 rounded-lg border flex flex-col items-center gap-3"
      style={{ background: theme.offWhite, borderColor: theme.borderGray }}
    >
      <h4 className="font-sans font-semibold text-sm text-center" style={{ color: theme.black }}>
        {name}
      </h4>
      <PercentOfNormalGauge value={pctOfNormal} size={90} />
      <ConditionBadge pctOfNormal={pctOfNormal} size="small" />
      <div className="font-mono text-[11px] text-center" style={{ color: theme.gray }}>
        {belowNormalCount} of {stationCount} stations below normal
      </div>
    </div>
  );
}
