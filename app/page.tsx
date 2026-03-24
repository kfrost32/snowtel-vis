"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useStationList } from "@/hooks/useStationList";
import { theme } from "@/lib/theme";
import { computeBasinSummaries, computeBasinCentroid } from "@/lib/basins";
import { getStation } from "@/lib/stations";
import MapControls from "@/components/MapControls";
import StationDetailPanel from "@/components/StationDetailPanel";
import BasinDetailPanel from "@/components/BasinDetailPanel";
import type { BasinMarker } from "@/components/StationMap";
import type { BasinSummary } from "@/lib/types";

const METRIC_LEGEND: Record<string, { label: string; color: string }[]> = {
  WTEQ: [
    { label: "<50%", color: "#DC2626" },
    { label: "50–75%", color: "#F59E0B" },
    { label: "75–110%", color: "#22C55E" },
    { label: "110–150%", color: "#3B82F6" },
    { label: ">150%", color: "#1D4ED8" },
  ],
  SNWD: [
    { label: '0"', color: "#CBD5E1" },
    { label: "1'", color: "#C4B5FD" },
    { label: "3'", color: "#A78BFA" },
    { label: "6'", color: "#8B5CF6" },
    { label: "10'+", color: "#6D28D9" },
  ],
  PREC: [
    { label: '0"', color: "#CBD5E1" },
    { label: '10"', color: "#A5F3FC" },
    { label: '20"', color: "#67E8F9" },
    { label: '35"', color: "#22D3EE" },
    { label: '50"+', color: "#0891B2" },
  ],
  TOBS: [
    { label: "<10°", color: "#1D4ED8" },
    { label: "25°", color: "#3B82F6" },
    { label: "32°", color: "#93C5FD" },
    { label: "40°", color: "#FDE68A" },
    { label: "55°+", color: "#EF4444" },
  ],
};

const StationMap = dynamic(() => import("@/components/StationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: theme.lightGray }}>
      <Loader2 className="animate-spin" size={24} style={{ color: theme.mediumGray }} />
    </div>
  ),
});

export default function HomePage() {
  const { stations, loading, error } = useStationList();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [elevMin, setElevMin] = useState("");
  const [elevMax, setElevMax] = useState("");
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number; triplet: string } | null>(null);
  const [showStations, setShowStations] = useState(true);
  const [showHuc2, setShowHuc2] = useState(false);
  const [showHuc4, setShowHuc4] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [metric, setMetric] = useState("WTEQ");
  const [selectedTriplet, setSelectedTriplet] = useState<string | null>(null);
  const [selectedBasinHuc, setSelectedBasinHuc] = useState<string | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);

  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      if (selectedStates.size > 0 && !selectedStates.has(s.state)) return false;
      if (elevMin && s.elevation < Number(elevMin)) return false;
      if (elevMax && s.elevation > Number(elevMax)) return false;
      if (activeOnly && s.swe === null) return false;
      return true;
    });
  }, [stations, selectedStates, elevMin, elevMax, activeOnly]);

  const huc2Basins = useMemo(() => (!stations.length ? [] : computeBasinSummaries(stations, 2)), [stations]);
  const huc4Basins = useMemo(() => (!stations.length ? [] : computeBasinSummaries(stations, 4)), [stations]);

  const toMarkers = (basins: ReturnType<typeof computeBasinSummaries>): BasinMarker[] =>
    basins.map((b) => {
      const centroid = computeBasinCentroid(b.stations);
      return { huc: b.huc, name: b.name, latitude: centroid.latitude, longitude: centroid.longitude, medianPctOfNormal: b.medianPctOfNormal, stationCount: b.stationCount };
    });

  const huc2Markers = useMemo(() => toMarkers(huc2Basins), [huc2Basins]);
  const huc4Markers = useMemo(() => toMarkers(huc4Basins), [huc4Basins]);

  const allBasins = useMemo(() => [...huc2Basins, ...huc4Basins], [huc2Basins, huc4Basins]);

  const selectedBasin: BasinSummary | null = useMemo(() => {
    if (!selectedBasinHuc) return null;
    return allBasins.find((b) => b.huc === selectedBasinHuc) || null;
  }, [allBasins, selectedBasinHuc]);

  const handleStationClick = (triplet: string) => {
    const station = getStation(triplet);
    if (station) {
      setFlyTo({ lng: station.longitude, lat: station.latitude, triplet });
    }
    setSelectedTriplet(triplet);
    setSelectedBasinHuc(null);
  };

  const handleBasinClick = (huc: string) => {
    const marker = [...huc2Markers, ...huc4Markers].find((b) => b.huc === huc);
    if (marker) {
      setFlyTo({ lng: marker.longitude, lat: marker.latitude, triplet: huc });
    }
    setSelectedBasinHuc(huc);
    setSelectedTriplet(null);
  };

  const closeDetailPanel = () => {
    setSelectedTriplet(null);
    setSelectedBasinHuc(null);
  };

  const hasDetailPanel = selectedTriplet !== null || selectedBasin !== null;

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
                {`${filteredStations.length} stations`}
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close sidebar"
              >
                <ChevronLeft size={16} style={{ color: theme.gray }} />
              </button>
            </div>

            <div className="flex-shrink-0" style={{ borderColor: theme.borderGray }}>
              <MapControls
                metric={metric}
                onMetricChange={setMetric}
                showStations={showStations}
                onShowStationsChange={setShowStations}
                showHuc2={showHuc2}
                onShowHuc2Change={setShowHuc2}
                showHuc4={showHuc4}
                onShowHuc4Change={setShowHuc4}
                activeOnly={activeOnly}
                onActiveOnlyChange={setActiveOnly}
                selectedStates={selectedStates}
                onStatesChange={setSelectedStates}
                elevMin={elevMin}
                elevMax={elevMax}
                onElevMinChange={setElevMin}
                onElevMaxChange={setElevMax}
              />
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
              flyTo={flyTo}
              huc2Markers={huc2Markers}
              huc4Markers={huc4Markers}
              showStations={showStations}
              showHuc2={showHuc2}
              showHuc4={showHuc4}
              metric={metric}
              onStationSelect={handleStationClick}
              onBasinSelect={handleBasinClick}
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
              {(METRIC_LEGEND[metric] ?? METRIC_LEGEND.TOBS).map(({ label, color }) => (
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

        {hasDetailPanel && (
          <div
            className="flex-shrink-0 flex flex-col border-l overflow-hidden z-10 relative transition-[width] duration-200"
            style={{
              width: panelExpanded ? 800 : 520,
              borderColor: theme.borderGray,
              background: theme.white,
            }}
          >
            <button
              onClick={() => setPanelExpanded(!panelExpanded)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-20 flex items-center justify-center w-6 h-12 rounded-l-md shadow-md cursor-pointer"
              style={{ background: theme.white, border: `1px solid ${theme.borderGray}`, borderRight: "none" }}
              aria-label={panelExpanded ? "Collapse panel" : "Expand panel"}
            >
              {panelExpanded ? (
                <ChevronRight size={14} style={{ color: theme.gray }} />
              ) : (
                <ChevronLeft size={14} style={{ color: theme.gray }} />
              )}
            </button>
            {selectedTriplet ? (
              <StationDetailPanel
                triplet={selectedTriplet}
                onClose={closeDetailPanel}
                onStationClick={handleStationClick}
              />
            ) : selectedBasin ? (
              <BasinDetailPanel
                basin={selectedBasin}
                onClose={closeDetailPanel}
                onStationClick={handleStationClick}
              />
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
