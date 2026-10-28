import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { PACE_COLORS, describePace } from "@snotel/core/pace";
import type { EnvelopeStats } from "@snotel/core/station-stats";
import { theme } from "@/lib/theme";

const ICONS = { ahead: TrendingUp, behind: TrendingDown, even: Minus };

export default function PaceSummary({ name, stats }: { name: string; stats: EnvelopeStats | null }) {
  if (!stats?.pace) return null;
  const { headline, detail } = describePace(name, stats.pace);
  const Icon = ICONS[stats.pace.tone];
  const color = PACE_COLORS[stats.pace.tone];
  return (
    <div className="px-3 pt-3">
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border font-sans" style={{ background: `${color}12`, borderColor: `${color}40` }}>
        <span className="shrink-0 flex items-center justify-center size-8 rounded-full" style={{ background: `${color}26`, color }}>
          <Icon size={16} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight" style={{ color: theme.black }}>{headline}</div>
          <div className="text-xs mt-0.5" style={{ color: theme.gray }}>{detail}</div>
        </div>
      </div>
    </div>
  );
}
