"use client";

import { snowColors } from "@/lib/theme";
import type { ConditionLevel } from "@/lib/types";

interface ConditionBarProps {
  counts: Record<ConditionLevel, number>;
  total: number;
}

const LEVELS: { key: ConditionLevel; label: string; color: string }[] = [
  { key: "wellBelow", label: "Well Below", color: snowColors.wellBelow },
  { key: "below", label: "Below", color: snowColors.below },
  { key: "nearNormal", label: "Near Normal", color: snowColors.nearNormal },
  { key: "above", label: "Above", color: snowColors.above },
  { key: "wellAbove", label: "Well Above", color: snowColors.wellAbove },
];

export default function ConditionBar({ counts, total }: ConditionBarProps) {
  return (
    <div>
      <div className="flex rounded-lg overflow-hidden h-12 sm:h-14">
        {LEVELS.map(({ key, color }) => {
          const pct = total > 0 ? (counts[key] / total) * 100 : 0;
          if (pct < 1) return null;
          return (
            <div
              key={key}
              className="flex items-center justify-center font-mono text-xs sm:text-sm font-medium text-white min-w-0"
              style={{ width: `${pct}%`, background: color }}
            >
              {pct >= 5 ? `${Math.round(pct)}%` : ""}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {LEVELS.map(({ key, label, color }) => {
          const count = counts[key];
          if (!count) return null;
          return (
            <div key={key} className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: "#5A6B73" }}>
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
              {label}: {count}
            </div>
          );
        })}
      </div>
    </div>
  );
}
