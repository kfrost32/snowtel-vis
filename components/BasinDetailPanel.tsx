"use client";

import { useMemo, useRef, useState } from "react";
import { X, Star } from "lucide-react";
import { theme } from "@/lib/theme";
import { formatSwe, formatPctOfNormal, formatDateFull } from "@/lib/formatting";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getConditionColor, getConditionLabel } from "@/lib/colors";
import type { BasinSummary } from "@/lib/types";
import PercentOfNormalGauge from "@/components/PercentOfNormalGauge";
import ConditionBadge from "@/components/ConditionBadge";
import ChartCard from "@/components/ChartCard";
import EnvelopeChart from "@/components/EnvelopeChart";
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
  const { data: envelopeData, loading: envelopeLoading } = useBasinEnvelopeData(basin.huc);

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
        className="relative px-5 pt-10 pb-4 border-b"
        style={{ borderColor: theme.borderGray }}
      >
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={onToggleFavorite}
            className="p-2 rounded-md hover:bg-black/[0.05] transition-colors cursor-pointer"
            style={{ color: isFavorite ? "#FBBF24" : theme.gray }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star size={18} fill={isFavorite ? "#FBBF24" : "none"} />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="p-2 rounded-md hover:bg-black/[0.05] transition-colors cursor-pointer"
            style={{ color: theme.gray }}
            aria-label="Export basin snapshot"
            title="Save as image"
          >
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 0 0 3.5 13h7a1.5 1.5 0 0 0 1.5-1.5V10" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-black/[0.05] transition-colors cursor-pointer"
            style={{ color: theme.gray }}
            aria-label="Close basin detail"
          >
            <X size={20} />
          </button>
        </div>
        <h2
          className="text-lg font-semibold tracking-tight font-sans leading-snug"
          style={{ color: theme.black }}
        >
          {basin.name}
        </h2>
        {basin.region && (
          <p className="font-mono text-[11px] mt-0.5" style={{ color: theme.mediumGray }}>
            {basin.region}
          </p>
        )}
        <p className="font-mono text-[11px] mt-0.5" style={{ color: theme.mediumGray }}>
          {basin.stationCount} station{basin.stationCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div ref={snapshotRef} className="bg-white">
        <div className="flex justify-center py-5">
          <PercentOfNormalGauge value={basin.medianPctOfNormal} size={140} />
        </div>

        <div className="px-5 mb-1">
          <div className="text-center font-sans text-sm font-semibold" style={{ color: theme.black }}>
            {basin.name}
          </div>
          <div className="text-center font-mono text-[11px] mt-0.5" style={{ color: getConditionColor(basin.medianPctOfNormal) }}>
            {getConditionLabel(basin.medianPctOfNormal)}
          </div>
        </div>

        <div
          className="grid grid-cols-3 gap-px mx-5 mb-5 mt-3 rounded-lg overflow-hidden border"
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
          className="mx-5 mb-4 px-3 py-2 rounded-lg border"
          style={{ borderColor: theme.borderGray, background: theme.offWhite }}
        >
          <div className="font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: theme.mediumGray }}>
            Top stations by SWE
          </div>
          {[...basin.stations]
            .filter((s) => s.swe !== null)
            .sort((a, b) => (b.swe ?? 0) - (a.swe ?? 0))
            .slice(0, 5)
            .map((station) => (
              <div key={station.triplet} className="flex items-center justify-between py-1">
                <span className="font-sans text-xs truncate" style={{ color: theme.darkGray, maxWidth: "55%" }}>
                  {station.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs" style={{ color: theme.gray }}>
                    {formatSwe(station.swe)}
                  </span>
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: getConditionColor(station.pctOfNormal) }}
                  >
                    {formatPctOfNormal(station.pctOfNormal)}
                  </span>
                </div>
              </div>
            ))}
        </div>

        <div
          className="flex items-center justify-between mx-5 mb-4 font-mono"
          style={{ borderTop: `1px solid ${theme.borderGray}`, paddingTop: 10 }}
        >
          <span style={{ color: theme.gray, fontSize: "10px" }}>SNOTEL Explorer · snotel.app</span>
          <span style={{ color: theme.mediumGray, fontSize: "10px" }}>
            {formatDateFull(new Date().toISOString().slice(0, 10))} · Source: USDA NRCS
          </span>
        </div>
      </div>

      <div className="px-5 pb-4">
        <ChartCard title={`Basin SWE — ${basin.name}`} height={320} exportable={false}>
          {envelopeLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : envelopeData ? (
            <EnvelopeChart data={envelopeData} stationName={basin.name} />
          ) : (
            <div className="flex items-center justify-center h-full font-mono text-xs" style={{ color: theme.mediumGray }}>
              No historical data available
            </div>
          )}
        </ChartCard>
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
