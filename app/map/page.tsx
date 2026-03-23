"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useStationList } from "@/hooks/useStationList";
import { getMapMarkerColor } from "@/lib/colors";
import { formatSwe, formatPctOfNormal, formatElevation } from "@/lib/formatting";
import { theme } from "@/lib/theme";
import { computeBasinSummaries, computeBasinCentroid } from "@/lib/basins";
import MapControls from "@/components/MapControls";
import type { BasinMarker } from "@/components/StationMap";

const StationMap = dynamic(() => import("@/components/StationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: theme.lightGray }}>
      <Loader2 className="animate-spin" size={24} style={{ color: theme.mediumGray }} />
    </div>
  ),
});

export default function MapPage() {
  const { stations, loading, error } = useStationList();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [elevMin, setElevMin] = useState("");
  const [elevMax, setElevMax] = useState("");
  const [visibleTriplets, setVisibleTriplets] = useState<Set<string>>(new Set());
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number; triplet: string } | null>(null);
  const [viewMode, setViewMode] = useState<"stations" | "basins">("stations");
  const [basinLevel, setBasinLevel] = useState<2 | 4>(2);
  const [metric, setMetric] = useState("WTEQ");

  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      if (selectedStates.size > 0 && !selectedStates.has(s.state)) return false;
      if (elevMin && s.elevation < Number(elevMin)) return false;
      if (elevMax && s.elevation > Number(elevMax)) return false;
      return true;
    });
  }, [stations, selectedStates, elevMin, elevMax]);

  const visibleFilteredStations = useMemo(() => {
    if (visibleTriplets.size === 0) return filteredStations;
    return filteredStations.filter((s) => visibleTriplets.has(s.triplet));
  }, [filteredStations, visibleTriplets]);

  const basinMarkers: BasinMarker[] = useMemo(() => {
    if (!stations.length) return [];
    const basins = computeBasinSummaries(stations, basinLevel);
    return basins.map((b) => {
      const centroid = computeBasinCentroid(b.stations);
      return {
        huc: b.huc,
        name: b.name,
        latitude: centroid.latitude,
        longitude: centroid.longitude,
        medianPctOfNormal: b.medianPctOfNormal,
        stationCount: b.stationCount,
      };
    });
  }, [stations, basinLevel]);

  const handleVisibleStationsChange = useCallback((triplets: Set<string>) => {
    setVisibleTriplets(triplets);
  }, []);

  const handleStationClick = (s: (typeof stations)[0]) => {
    setFlyTo({ lng: s.longitude, lat: s.latitude, triplet: s.triplet });
  };

  return (
    <>
      <style>{`
        .map-page-root { height: calc(100vh - 56px); }
        @media (min-width: 768px) {
          .map-page-root { height: calc(100vh - 48px); }
        }
      `}</style>
      <div className="map-page-root flex w-full relative">
        {sidebarOpen && (
          <div
            className="flex-shrink-0 flex flex-col border-r overflow-hidden z-10"
            style={{
              width: 320,
              borderColor: theme.borderGray,
              background: theme.white,
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
              style={{ borderColor: theme.borderGray }}
            >
              <div className="text-xs font-mono" style={{ color: theme.mediumGray }}>
                {viewMode === "stations"
                  ? `${visibleFilteredStations.length} of ${filteredStations.length} visible`
                  : `${basinMarkers.length} basins`}
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close sidebar"
              >
                <ChevronLeft size={16} style={{ color: theme.gray }} />
              </button>
            </div>

            <div className="flex-shrink-0 border-b" style={{ borderColor: theme.borderGray }}>
              <MapControls
                metric={metric}
                onMetricChange={setMetric}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                basinLevel={basinLevel}
                onBasinLevelChange={setBasinLevel}
                selectedStates={selectedStates}
                onStatesChange={setSelectedStates}
                elevMin={elevMin}
                elevMax={elevMax}
                onElevMinChange={setElevMin}
                onElevMaxChange={setElevMax}
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin" size={20} style={{ color: theme.mediumGray }} />
                </div>
              ) : error ? (
                <div className="px-4 py-8 text-center text-xs font-sans" style={{ color: theme.mediumGray }}>
                  Failed to load data
                </div>
              ) : viewMode === "basins" ? (
                <div>
                  {basinMarkers
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((b) => (
                    <button
                      key={b.huc}
                      onClick={() => setFlyTo({ lng: b.longitude, lat: b.latitude, triplet: b.huc })}
                      className="w-full text-left px-4 py-2.5 border-b flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      style={{ borderColor: theme.borderGray }}
                    >
                      <div
                        className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                        style={{ background: getMapMarkerColor(b.medianPctOfNormal) }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold font-sans truncate" style={{ color: theme.black }}>
                          {b.name}
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: theme.mediumGray }}>
                          {b.stationCount} stations
                        </div>
                      </div>
                      <div
                        className="flex-shrink-0 text-xs font-mono font-semibold"
                        style={{ color: getMapMarkerColor(b.medianPctOfNormal) }}
                      >
                        {formatPctOfNormal(b.medianPctOfNormal)}
                      </div>
                    </button>
                  ))}
                </div>
              ) : visibleFilteredStations.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs font-sans" style={{ color: theme.mediumGray }}>
                  No stations in view
                </div>
              ) : (
                <div>
                  {visibleFilteredStations
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((s) => (
                    <button
                      key={s.triplet}
                      onClick={() => handleStationClick(s)}
                      className="w-full text-left px-4 py-2.5 border-b flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      style={{ borderColor: theme.borderGray }}
                    >
                      <div
                        className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                        style={{ background: getMapMarkerColor(s.pctOfNormal) }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold font-sans truncate" style={{ color: theme.black }}>
                          {s.name}
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: theme.mediumGray }}>
                          {s.state} · {formatElevation(s.elevation)}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs font-mono font-semibold" style={{ color: theme.black }}>
                          {formatSwe(s.swe)}
                        </div>
                        <div
                          className="text-[10px] font-mono font-medium"
                          style={{ color: getMapMarkerColor(s.pctOfNormal) }}
                        >
                          {formatPctOfNormal(s.pctOfNormal)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-6 h-12 rounded-r-md shadow-md cursor-pointer"
            style={{ background: theme.white, border: `1px solid ${theme.borderGray}`, borderLeft: "none" }}
            aria-label="Open sidebar"
          >
            <ChevronRight size={14} style={{ color: theme.gray }} />
          </button>
        )}

        <div className="flex-1 relative min-w-0">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center" style={{ background: theme.lightGray }}>
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin" size={24} style={{ color: theme.mediumGray }} />
                <span className="text-xs font-sans" style={{ color: theme.mediumGray }}>Loading stations…</span>
              </div>
            </div>
          ) : (
            <StationMap
              stations={filteredStations}
              onVisibleStationsChange={handleVisibleStationsChange}
              flyTo={flyTo}
              basinMarkers={basinMarkers}
              viewMode={viewMode}
              basinLevel={basinLevel}
            />
          )}

          <div
            className="absolute bottom-4 left-4 rounded-lg px-3 py-2 shadow-sm z-10"
            style={{
              background: `${theme.white}ee`,
              border: `1px solid ${theme.borderGray}`,
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: "<50%", color: "#DC2626" },
                { label: "50–75%", color: "#F59E0B" },
                { label: "75–110%", color: "#22C55E" },
                { label: "110–150%", color: "#3B82F6" },
                { label: ">150%", color: "#1D4ED8" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] font-mono" style={{ color: theme.gray }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
