"use client";

import { useState } from "react";
import { theme } from "@/lib/theme";
import { isSweMetric } from "@snotel/core/map-style";
import { legendFor } from "@/lib/map-legend";
import { GLASS_STYLE } from "@/lib/map-layout";

interface MapLegendProps {
  metric: string;
  dataDate: string | null;
  activeOnly: boolean;
  isMobile: boolean;
  left?: number;
}

export default function MapLegend({ metric, dataDate, activeOnly, isMobile, left }: MapLegendProps) {
  const [open, setOpen] = useState(false);
  const { title, items } = legendFor(metric);
  const swe = isSweMetric(metric);

  if (isMobile && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-4 left-4 z-10 flex items-center gap-2 h-9 px-3 rounded-full cursor-pointer"
        style={GLASS_STYLE}
        aria-label="Show legend"
      >
        <span className="flex h-2 w-12 rounded-full overflow-hidden">
          {items.map(({ label, color }) => (
            <span key={label} className="flex-1" style={{ background: color }} />
          ))}
        </span>
        <span className="text-xs font-sans font-semibold" style={{ color: theme.darkGray }}>
          {title}
        </span>
      </button>
    );
  }

  return (
    <div
      onClick={isMobile ? () => setOpen(false) : undefined}
      className="absolute bottom-4 left-4 right-4 md:right-auto rounded-xl px-3 py-2 z-10 transition-[left] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{ ...GLASS_STYLE, left: isMobile ? undefined : left }}
    >
      <div className="flex items-baseline justify-center md:justify-start gap-1.5 mb-1.5">
        <span className="text-xs font-sans font-semibold" style={{ color: theme.darkGray }}>
          {title}
        </span>
        {dataDate && (
          <span className="text-xs font-mono" style={{ color: theme.mediumGray }}>
            {dataDate}
          </span>
        )}
      </div>
      <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
        {items.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-xs font-mono" style={{ color: theme.gray }}>
              {label}
            </span>
          </div>
        ))}
        {swe && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: theme.mediumGray }} />
            <span className="text-xs font-mono" style={{ color: theme.gray }}>No median</span>
          </div>
        )}
        {swe && !activeOnly && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.mediumGray, opacity: 0.35 }} />
            <span className="text-xs font-mono" style={{ color: theme.gray }}>Not reporting</span>
          </div>
        )}
      </div>
    </div>
  );
}
