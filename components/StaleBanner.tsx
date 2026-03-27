"use client";

import { theme, snowColors } from "@/lib/theme";
import { timeAgo } from "@/lib/formatting";

interface StaleBannerProps {
  fetchedAt: number | null;
  stale: boolean;
}

export default function StaleBanner({ fetchedAt, stale }: StaleBannerProps) {
  if (!stale || !fetchedAt) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 font-mono text-xs"
      style={{
        background: `${snowColors.below}18`,
        borderBottom: `1px solid ${snowColors.below}40`,
        color: theme.gray,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: snowColors.below }}
      />
      NRCS data source unavailable — showing cached data from {timeAgo(fetchedAt)}
    </div>
  );
}
