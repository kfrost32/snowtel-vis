"use client";

import { useMemo, useRef, useState } from "react";
import { X, Star } from "lucide-react";
import { theme } from "@/lib/theme";
import { formatSwe, formatPctOfNormal, formatSnowDepth, formatChange } from "@/lib/formatting";
import { getConditionColor, getConditionLabel, getChangeColor } from "@/lib/colors";
import type { BasinSummary } from "@/lib/types";
import ConditionBadge from "@/components/ConditionBadge";
import ChartCard from "@/components/ChartCard";
import SweEnvelopeChart from "@/components/SweEnvelopeChart";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useBasinEnvelopeData } from "@/hooks/useBasinEnvelopeData";

interface BasinDetailPanelProps {
  basin: BasinSummary;
  onClose: () => void;
  onStationClick: (triplet: string) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function BasinDetailPanel({
  basin,
  onClose,
  onStationClick,
  isFavorite,
  onToggleFavorite,
}: BasinDetailPanelProps) {
  const snapshotRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!snapshotRef.current || exporting) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(snapshotRef.current, {
        quality: 1,
        backgroundColor: "#FFFFFF",
        pixelRatio: 2,
      });
      const name = basin.name.toLowerCase().replace(/\s+/g, "-");
      const link = document.createElement("a");
      link.download = `swe-${name}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  };

  const { data: envelopeData, loading: envelopeLoading } = useBasinEnvelopeData(basin.huc);

  const basinSeasonMap = useMemo(() => {
    if (!envelopeData?.currentSeason) return undefined;
    const m = new Map<number, number>();
    for (const d of envelopeData.currentSeason) {
      m.set(d.wyDay, d.swe);
    }
    return m;
  }, [envelopeData]);

  const sortedStations = useMemo(
    () => [...basin.stations].sort((a, b) => (b.pctOfNormal ?? -1) - (a.pctOfNormal ?? -1)),
    [basin.stations]
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: theme.white }}>
      {/* Hero */}
      <div
        className="shrink-0 relative flex flex-col justify-end border-b overflow-hidden px-4 pt-10 pb-3"
        style={{ borderColor: theme.borderGray, background: theme.black, minHeight: 120 }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)" }}
        />
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={onToggleFavorite}
            className="p-2 rounded-md transition-colors duration-150 cursor-pointer"
            style={{ color: isFavorite ? "#FBBF24" : "rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.25)" }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star size={18} fill={isFavorite ? "#FBBF24" : "none"} />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="p-2 rounded-md transition-colors duration-150 cursor-pointer"
            style={{ color: "rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.25)" }}
            aria-label="Export basin snapshot"
          >
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 0 0 3.5 13h7a1.5 1.5 0 0 0 1.5-1.5V10" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-150 cursor-pointer"
            style={{ color: "rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>
        <div className="relative">
          <h2 className="text-lg font-semibold tracking-tight font-sans truncate" style={{ color: "#FFFFFF" }}>
            {basin.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
            {basin.region && <span>{basin.region}</span>}
            <span>{basin.stationCount} stations</span>
            <span style={{ color: getConditionColor(basin.medianPctOfNormal) }}>{getConditionLabel(basin.medianPctOfNormal)}</span>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="overflow-x-auto border-b shrink-0" style={{ borderColor: theme.borderGray, WebkitOverflowScrolling: "touch" }}>
        <div className="flex items-stretch min-w-min">
          {[
            { label: "% Normal", value: formatPctOfNormal(basin.medianPctOfNormal), color: getConditionColor(basin.medianPctOfNormal) },
            { label: "Avg SWE", value: formatSwe(basin.avgSwe), color: theme.black },
            { label: "Avg Depth", value: formatSnowDepth(basin.stations.reduce((s, st) => s + (st.snowDepth ?? 0), 0) / (basin.stations.filter(s => s.snowDepth !== null).length || 1)), color: theme.black },
            { label: "Stations", value: String(basin.stationCount), color: theme.black },
          ].map((stat, i) => (
            <div key={stat.label} className="flex-1 min-w-[72px] flex flex-col px-3 py-2.5" style={{ borderLeft: i > 0 ? `1px solid ${theme.borderGray}` : undefined }}>
              <span className="font-mono text-[10px] whitespace-nowrap" style={{ color: theme.mediumGray }}>{stat.label}</span>
              <span className="font-mono text-[13px] font-semibold mt-0.5 whitespace-nowrap" style={{ color: stat.color }}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3">
          <ChartCard
            title={<span>{basin.name} <span className="font-normal text-base" style={{ color: theme.gray }}>SWE Envelope</span></span>}
            description={envelopeData ? `${envelopeData.stationCount} stations averaged` : undefined}
            height={240}
            exportable={false}
          >
            {envelopeLoading ? (
              <LoadingSpinner />
            ) : envelopeData ? (
              <SweEnvelopeChart
                envelope={envelopeData}
                seasonMap={basinSeasonMap}
                lastUpdated={new Date().toISOString().split("T")[0]}
              />
            ) : null}
          </ChartCard>
        </div>

        <div
          className="px-4 py-2 mt-3 border-t border-b"
          style={{ borderColor: theme.borderGray, background: theme.offWhite }}
        >
          <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: theme.gray }}>
            Stations
          </span>
        </div>

        {sortedStations.map((station) => (
          <button
            key={station.triplet}
            onClick={() => onStationClick(station.triplet)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 border-b transition-colors hover:bg-black/[0.02] cursor-pointer text-left"
            style={{ borderColor: theme.borderGray }}
          >
            <div className="min-w-0">
              <div className="font-sans text-sm font-medium truncate" style={{ color: theme.darkGray }}>
                {station.name}
              </div>
              <div className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>
                {station.state}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="text-right">
                <div className="font-mono text-sm" style={{ color: theme.darkGray }}>{formatSwe(station.swe)}</div>
                <div className="font-mono text-[11px]" style={{ color: getConditionColor(station.pctOfNormal) }}>{formatPctOfNormal(station.pctOfNormal)}</div>
              </div>
              <ConditionBadge pctOfNormal={station.pctOfNormal} size="small" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
