"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useStationList } from "@/hooks/useStationList";
import { useFavorites } from "@/hooks/useFavorites";
import { theme } from "@/lib/theme";
import { computeBasinSummaries, computeBasinCentroid } from "@/lib/basins";
import { getStation, urlTriplet, parseTripletFromUrl } from "@/lib/stations";
import MapControls from "@/components/MapControls";
import StationDetailPanel from "@/components/StationDetailPanel";
import BasinDetailPanel from "@/components/BasinDetailPanel";
import { SidebarSection, SidebarFavoriteItem } from "@/components/sidebar";
import type { BasinMarker } from "@/components/StationMap";
import type { BasinSummary } from "@/lib/types";

const PCT_LEGEND = [
  { label: "<50%", color: "#DC2626" },
  { label: "50–75%", color: "#F59E0B" },
  { label: "75–110%", color: "#22C55E" },
  { label: "110–150%", color: "#3B82F6" },
  { label: ">150%", color: "#1D4ED8" },
];

const CHANGE_LEGEND = [
  { label: "−2″+", color: "#DC2626" },
  { label: "−0.5″", color: "#F59E0B" },
  { label: "0", color: "#94A3B8" },
  { label: "+0.5″", color: "#3B82F6" },
  { label: "+2″+", color: "#1D4ED8" },
];

const METRIC_LABELS: Record<string, string> = {
  WTEQ: "SWE",
  WTEQ_PCT: "% of Normal",
  CHANGE_1D: "1-Day Change",
  CHANGE_3D: "3-Day Change",
  CHANGE_7D: "7-Day Change",
  SNWD: "Snow Depth",
  PREC: "Season Precip",
  TAVG: "Temperature",
};

const METRIC_LEGEND: Record<string, { label: string; color: string }[]> = {
  WTEQ: PCT_LEGEND,
  WTEQ_PCT: PCT_LEGEND,
  CHANGE_1D: CHANGE_LEGEND,
  CHANGE_7D: CHANGE_LEGEND,
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
  CHANGE_3D: CHANGE_LEGEND,
  TAVG: [
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

function HomePageInner() {
  const { stations, loading, error } = useStationList();
  const { favorites, toggleStation, toggleBasin, isStationFav, isBasinFav } = useFavorites();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    setSidebarOpen(!mql.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (e.matches) setSidebarOpen(false);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [elevMin, setElevMin] = useState("");
  const [elevMax, setElevMax] = useState("");
  const [showStations, setShowStations] = useState(true);
  const [showHuc2, setShowHuc2] = useState(false);
  const [showHuc4, setShowHuc4] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [metric, setMetric] = useState("WTEQ");
  const [overlayVisible, setOverlayVisible] = useState(false);

  const selectedTriplet = useMemo(() => {
    const param = searchParams.get("station");
    return param ? parseTripletFromUrl(param) : null;
  }, [searchParams]);

  const selectedBasinHuc = useMemo(() => searchParams.get("basin"), [searchParams]);


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
    if (isMobile) setSidebarOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("station", urlTriplet(triplet));
    params.delete("basin");
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const handleBasinClick = (huc: string) => {
    if (isMobile) setSidebarOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("basin", huc);
    params.delete("station");
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const closeDetailPanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("station");
    params.delete("basin");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeDetailPanel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (selectedTriplet || selectedBasinHuc) {
      requestAnimationFrame(() => setOverlayVisible(true));
    } else {
      setOverlayVisible(false);
    }
  }, [selectedTriplet, selectedBasinHuc]);

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
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-30"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {sidebarOpen && (
          <div
            className={`${isMobile ? "fixed top-14 left-0 bottom-0 z-30 shadow-xl" : "flex-shrink-0 border-r z-10"} flex flex-col overflow-hidden`}
            style={{
              width: isMobile ? "min(320px, 85vw)" : 320,
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

            <div className="flex-1 min-h-0 overflow-y-auto" style={{ borderColor: theme.borderGray }}>
              {(favorites.stations.length > 0 || favorites.basins.length > 0) && (
                <SidebarSection label="Favorites" flush>
                  {favorites.stations.map((triplet) => {
                    const s = getStation(triplet);
                    if (!s) return null;
                    return (
                      <SidebarFavoriteItem
                        key={triplet}
                        name={s.name}
                        detail={s.state}
                        onClick={() => handleStationClick(triplet)}
                        onRemove={() => toggleStation(triplet)}
                      />
                    );
                  })}
                  {favorites.basins.map((huc) => {
                    const b = allBasins.find((b) => b.huc === huc);
                    if (!b) return null;
                    return (
                      <SidebarFavoriteItem
                        key={huc}
                        name={b.name}
                        onClick={() => handleBasinClick(huc)}
                        onRemove={() => toggleBasin(huc)}
                      />
                    );
                  })}
                </SidebarSection>
              )}

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

          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div
              className="px-3 py-1 rounded-full text-xs font-mono shadow-sm"
              style={{
                background: `${theme.white}ee`,
                border: `1px solid ${theme.borderGray}`,
                backdropFilter: "blur(8px)",
                color: theme.darkGray,
              }}
            >
              {METRIC_LABELS[metric] ?? metric}
            </div>
          </div>

          <div
            className="absolute bottom-4 left-4 right-4 md:right-auto rounded-lg px-3 py-2 shadow-sm z-10"
            style={{
              background: `${theme.white}ee`,
              border: `1px solid ${theme.borderGray}`,
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
              {(METRIC_LEGEND[metric] ?? METRIC_LEGEND.TAVG).map(({ label, color }) => (
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
            className={`${isMobile ? "fixed inset-0 z-[60]" : "absolute inset-0 z-20"} pointer-events-none`}
            style={{ left: !isMobile && sidebarOpen ? 320 : 0 }}
          >
            <div
              className="absolute inset-0 md:inset-4 pointer-events-auto md:rounded-xl shadow-2xl overflow-hidden transition-all duration-200 md:mx-auto"
              style={{
                background: theme.white,
                border: isMobile ? "none" : `1px solid ${theme.borderGray}`,
                opacity: overlayVisible ? 1 : 0,
                transform: overlayVisible ? "scale(1)" : "scale(0.97)",
                transformOrigin: "center center",
                maxWidth: isMobile ? undefined : 1200,
              }}
            >
              {selectedTriplet ? (
                <StationDetailPanel
                  triplet={selectedTriplet}
                  onClose={closeDetailPanel}
                  onStationClick={handleStationClick}
                  isFavorite={isStationFav(selectedTriplet)}
                  onToggleFavorite={() => toggleStation(selectedTriplet)}
                />
              ) : selectedBasin ? (
                <BasinDetailPanel
                  basin={selectedBasin}
                  onClose={closeDetailPanel}
                  onStationClick={handleStationClick}
                  isFavorite={isBasinFav(selectedBasin.huc)}
                  onToggleFavorite={() => toggleBasin(selectedBasin.huc)}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}
