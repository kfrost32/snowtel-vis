"use client";

import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useStationList } from "@/hooks/useStationList";
import { useFavorites } from "@/hooks/useFavorites";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAnalytics } from "@/hooks/useAnalytics";
import { theme } from "@/lib/theme";
import { computeBasinSummaries, computeBasinCentroid } from "@/lib/basins";
import { getStation, urlTriplet, parseTripletFromUrl } from "@/lib/stations";
import StaleBanner from "@/components/StaleBanner";
import MapControls from "@/components/MapControls";
import StationDetailPanel from "@/components/StationDetailPanel";
import BasinDetailPanel from "@/components/BasinDetailPanel";
import { getAllSpots } from "@/lib/spots";
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

const DEPTH_CHANGE_LEGEND = [
  { label: "−6″+", color: "#DC2626" },
  { label: "−2″", color: "#F59E0B" },
  { label: "0", color: "#94A3B8" },
  { label: "+2″", color: "#3B82F6" },
  { label: "+6″+", color: "#1D4ED8" },
];

const METRIC_LABELS: Record<string, string> = {
  WTEQ: "SWE",
  WTEQ_PCT: "% of Median",
  CHANGE_1D: "1-Day Change",
  CHANGE_3D: "3-Day Change",
  CHANGE_7D: "7-Day Change",
  SNWD_CHANGE_1D: "Snow Depth 1-Day Δ",
  SNWD_CHANGE_3D: "Snow Depth 3-Day Δ",
  SNWD_CHANGE_7D: "Snow Depth 7-Day Δ",
  SNWD: "Snow Depth",
  PREC: "Season Precip",
  TAVG: "Temperature",
};

const LEGEND_TITLES: Record<string, string> = {
  WTEQ: "SWE, % of median",
  WTEQ_PCT: "SWE, % of median",
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
  SNWD_CHANGE_1D: DEPTH_CHANGE_LEGEND,
  SNWD_CHANGE_3D: DEPTH_CHANGE_LEGEND,
  SNWD_CHANGE_7D: DEPTH_CHANGE_LEGEND,
  TAVG: [
    { label: "<10°", color: "#1D4ED8" },
    { label: "25°", color: "#3B82F6" },
    { label: "32°", color: "#93C5FD" },
    { label: "40°", color: "#FDE68A" },
    { label: "55°+", color: "#EF4444" },
  ],
};

const SIDEBAR_WIDTH = 300;
const SIDEBAR_INSET = 12;

const GLASS_STYLE = {
  background: "rgba(255, 255, 255, 0.86)",
  backdropFilter: "blur(24px) saturate(140%)",
  WebkitBackdropFilter: "blur(24px) saturate(140%)",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  boxShadow: "0 8px 32px rgba(15, 23, 42, 0.12), 0 1px 2px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
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
  const { stations, loading, error, fetchedAt, stale } = useStationList();
  const { favorites, toggleStation, toggleBasin, isStationFav, isBasinFav } = useFavorites();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  const [showHuc2, setShowHuc2] = useState(true);
  const [showHuc4, setShowHuc4] = useState(false);
  const [showResorts, setShowResorts] = useState(true);
  const [showBackcountry, setShowBackcountry] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);
  const [metric, setMetric] = useState("WTEQ");
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [selectedTriplet, setSelectedTriplet] = useState<string | null>(() => {
    const param = searchParams.get("station");
    return param ? parseTripletFromUrl(param) : null;
  });
  const [selectedBasinHuc, setSelectedBasinHuc] = useState<string | null>(() => searchParams.get("basin"));

  useEffect(() => {
    const stationParam = searchParams.get("station");
    const triplet = stationParam ? parseTripletFromUrl(stationParam) : null;
    const basin = searchParams.get("basin") ?? null;
    setSelectedTriplet((prev) => prev === triplet ? prev : triplet);
    setSelectedBasinHuc((prev) => prev === basin ? prev : basin);
  }, [searchParams]);

  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      if (selectedStates.size > 0 && !selectedStates.has(s.state)) return false;
      if (elevMin && s.elevation < Number(elevMin)) return false;
      if (elevMax && s.elevation > Number(elevMax)) return false;
      if (activeOnly && s.swe === null) return false;
      return true;
    });
  }, [stations, selectedStates, elevMin, elevMax, activeOnly]);

  const dataDate = useMemo(() => {
    const latest = stations.reduce((max, s) => (s.lastUpdated > max ? s.lastUpdated : max), "");
    if (!latest) return null;
    return new Date(`${latest}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [stations]);

  const isSweMetric = metric === "WTEQ" || metric === "WTEQ_PCT";

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

  const selectedStation = selectedTriplet ? getStation(selectedTriplet) : null;
  const spots = useMemo(() => getAllSpots(), []);
  usePageTitle(selectedStation?.name ?? selectedBasin?.name ?? null);
  useAnalytics(selectedTriplet, selectedBasinHuc);

  const handleStationClick = (triplet: string) => {
    if (isMobile) setSidebarOpen(false);
    setSelectedTriplet(triplet);
    setSelectedBasinHuc(null);
  };

  const handleBasinClick = (huc: string) => {
    if (isMobile) setSidebarOpen(false);
    setSelectedBasinHuc(huc);
    setSelectedTriplet(null);
  };

  const closeDetailPanel = useCallback(() => {
    setSelectedTriplet(null);
    setSelectedBasinHuc(null);
  }, []);

  useEffect(() => {
    const qs = selectedTriplet
      ? `station=${urlTriplet(selectedTriplet)}`
      : selectedBasinHuc
        ? `basin=${selectedBasinHuc}`
        : "";
    const url = qs ? `/?${qs}` : "/";
    if (window.location.pathname + window.location.search === url) return;
    router.replace(url, { scroll: false });
  }, [selectedTriplet, selectedBasinHuc, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeDetailPanel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDetailPanel]);

  useEffect(() => {
    if (selectedTriplet || selectedBasinHuc) {
      requestAnimationFrame(() => setOverlayVisible(true));
    } else {
      setOverlayVisible(false);
    }
  }, [selectedTriplet, selectedBasinHuc]);

  const openSearch = () => window.dispatchEvent(new CustomEvent("open-command-search"));

  const hasDetailPanel = selectedTriplet !== null || selectedBasin !== null;

  return (
    <>
      <StaleBanner fetchedAt={fetchedAt} stale={stale} />
      <div className="h-dvh flex w-full relative">
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-30"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {sidebarOpen && (
          <div
            className={`${isMobile ? "fixed top-0 left-0 bottom-0 z-30" : "absolute z-20 rounded-2xl"} flex flex-col overflow-hidden`}
            style={{
              ...GLASS_STYLE,
              width: isMobile ? "min(320px, 85vw)" : SIDEBAR_WIDTH,
              ...(isMobile ? {} : { top: SIDEBAR_INSET, left: SIDEBAR_INSET, bottom: SIDEBAR_INSET }),
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
              style={{ borderColor: "rgba(15, 23, 42, 0.06)" }}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-tight font-sans truncate" style={{ color: theme.black }}>
                  SNOTEL Explorer
                </div>
                <div className="text-[10px] font-mono" style={{ color: theme.mediumGray }}>
                  {`${filteredStations.length} stations`}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={openSearch}
                  className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-black/[0.05] transition-colors cursor-pointer"
                  aria-label="Search"
                >
                  <Search size={14} style={{ color: theme.gray }} />
                  <kbd className="hidden md:inline font-mono text-[10px] leading-none" style={{ color: theme.mediumGray }}>⌘K</kbd>
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-md hover:bg-black/[0.05] transition-colors cursor-pointer"
                  aria-label="Close sidebar"
                >
                  <ChevronLeft size={16} style={{ color: theme.gray }} />
                </button>
              </div>
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
                showResorts={showResorts}
                onShowResortsChange={setShowResorts}
                showBackcountry={showBackcountry}
                onShowBackcountryChange={setShowBackcountry}
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
          <div
            className="absolute z-20 flex items-center gap-0.5 p-0.5 rounded-xl"
            style={{ ...GLASS_STYLE, top: SIDEBAR_INSET, left: SIDEBAR_INSET }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/[0.05] transition-colors cursor-pointer"
              aria-label="Open sidebar"
            >
              <ChevronRight size={16} style={{ color: theme.gray }} />
            </button>
            <button
              onClick={openSearch}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black/[0.05] transition-colors cursor-pointer"
              aria-label="Search"
            >
              <Search size={14} style={{ color: theme.gray }} />
            </button>
          </div>
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
              spots={spots}
              showResorts={showResorts}
              showBackcountry={showBackcountry}
            />
          )}

          <div
            className="absolute bottom-4 left-4 right-4 md:right-auto rounded-xl px-3 py-2 z-10"
            style={{
              ...GLASS_STYLE,
              left: !isMobile && sidebarOpen ? SIDEBAR_WIDTH + SIDEBAR_INSET * 2 : undefined,
            }}
          >
            <div className="flex items-baseline justify-center md:justify-start gap-1.5 mb-1.5">
              <span className="text-[11px] font-sans font-semibold" style={{ color: theme.darkGray }}>
                {LEGEND_TITLES[metric] ?? METRIC_LABELS[metric] ?? metric}
              </span>
              {dataDate && (
                <span className="text-[10px] font-mono" style={{ color: theme.mediumGray }}>
                  {dataDate}
                </span>
              )}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
              {(METRIC_LEGEND[metric] ?? METRIC_LEGEND.TAVG).map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] font-mono" style={{ color: theme.gray }}>
                    {label}
                  </span>
                </div>
              ))}
              {isSweMetric && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: theme.mediumGray }} />
                  <span className="text-[10px] font-mono" style={{ color: theme.gray }}>No median</span>
                </div>
              )}
              {isSweMetric && !activeOnly && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.mediumGray, opacity: 0.35 }} />
                  <span className="text-[10px] font-mono" style={{ color: theme.gray }}>Not reporting</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {hasDetailPanel && (
          <div
            className={`${isMobile ? "fixed inset-0 z-[60]" : "absolute inset-0 z-20"} pointer-events-none`}
            style={{ left: !isMobile && sidebarOpen ? SIDEBAR_WIDTH + SIDEBAR_INSET : 0 }}
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
