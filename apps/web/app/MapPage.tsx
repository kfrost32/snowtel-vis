"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { ChevronRight, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useStationList } from "@/hooks/useStationList";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useIsDark, useSettings } from "@/lib/settings";
import { useRecentConditions } from "@/hooks/useRecentConditions";
import { useForecastTotals } from "@/hooks/useForecastTotals";
import { withForecasts } from "@snotel/core/forecast";
import { useMapFilters } from "@/hooks/useMapFilters";
import { useMapSelection } from "@/hooks/useMapSelection";
import { dataAsOfLabel, withRecentDepth } from "@snotel/core/recent";
import { useFavorites } from "@/hooks/useFavorites";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAnalytics } from "@/hooks/useAnalytics";
import { theme } from "@/lib/theme";
import { computeBasinSummaries } from "@snotel/core/basins";
import { regionMarkers, stateBounds } from "@snotel/core/map-style";
import { filterStations } from "@snotel/core/filters";
import { getStation, getPlaceholderConditions } from "@snotel/core/stations";
import { getAllSpots } from "@snotel/core/spots";
import BottomSheet from "@/components/BottomSheet";
import StationDetailPanel from "@/components/StationDetailPanel";
import BasinDetailPanel from "@/components/BasinDetailPanel";
import MapLegend from "@/components/MapLegend";
import MapSidebar from "@/components/MapSidebar";
import { DETAIL_WIDTH, EXPANDED_DETAIL_MAX, GLASS_STYLE, SIDEBAR_INSET, SIDEBAR_WIDTH } from "@/lib/map-layout";
import { storedValue, useStoredValue } from "@/lib/stored-value";

const StationMap = dynamic(() => import("@/components/StationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: theme.lightGray }}>
      <Loader2 className="animate-spin" size={24} style={{ color: theme.mediumGray }} />
    </div>
  ),
});

const openSearch = () => window.dispatchEvent(new CustomEvent("open-command-search"));
const expandedStore = storedValue("snotel:detail-expanded", false, (raw) => raw === "true");

function HomePageInner() {
  const { stations: liveStations, loading, stale } = useStationList();
  const recent = useRecentConditions();
  const forecasts = useForecastTotals();
  const baseStations = useMemo(
    () => (loading ? getPlaceholderConditions() : withRecentDepth(liveStations, recent)),
    [loading, liveStations, recent]
  );
  const stations = useMemo(() => withForecasts(baseStations, forecasts), [baseStations, forecasts]);
  const { toggleStation, toggleBasin, isStationFav, isBasinFav } = useFavorites();
  const { filters, controls } = useMapFilters();
  const { metric, selectedStates } = controls;
  const selection = useMapSelection();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const dark = useIsDark();
  const [sidebarChoice, setSidebarChoice] = useState<{ open: boolean; mobile: boolean } | null>(null);
  const sidebarOpen = sidebarChoice && sidebarChoice.mobile === isMobile ? sidebarChoice.open : !isMobile;
  const setSidebarOpen = (open: boolean) => setSidebarChoice({ open, mobile: isMobile });
  const [overlayVisible, setOverlayVisible] = useState(false);

  const filteredStations = useMemo(() => filterStations(stations, filters, !loading), [stations, filters, loading]);
  const dataDate = useMemo(() => dataAsOfLabel(metric, stations, recent, forecasts?.updated), [stations, metric, recent, forecasts]);

  const selectedStateList = useMemo(() => [...selectedStates], [selectedStates]);
  const { homeState } = useSettings();
  const homeBounds = useMemo(() => (homeState && !selectedStates.size ? stateBounds([homeState]) : null), [homeState, selectedStates]);
  const regionStations = useMemo(
    () => (selectedStates.size ? baseStations.filter((s) => selectedStates.has(s.state)) : baseStations),
    [baseStations, selectedStates]
  );
  const huc2Basins = useMemo(() => (!regionStations.length ? [] : computeBasinSummaries(regionStations, 2)), [regionStations]);
  const huc4Basins = useMemo(() => (!regionStations.length ? [] : computeBasinSummaries(regionStations, 4)), [regionStations]);
  const huc2Markers = useMemo(() => regionMarkers(huc2Basins), [huc2Basins]);
  const huc4Markers = useMemo(() => regionMarkers(huc4Basins), [huc4Basins]);
  const allBasins = useMemo(() => [...huc2Basins, ...huc4Basins], [huc2Basins, huc4Basins]);
  const spots = useMemo(
    () => getAllSpots().filter((spot) => !selectedStates.size || selectedStates.has(spot.state)),
    [selectedStates]
  );

  const selectedTriplet = selection.triplet;
  const selectedBasin = useMemo(
    () => (selection.basinHuc ? allBasins.find((b) => b.huc === selection.basinHuc) ?? null : null),
    [allBasins, selection.basinHuc]
  );
  const selectedStation = selectedTriplet ? getStation(selectedTriplet) : null;
  usePageTitle(selectedStation?.name ?? selectedBasin?.name ?? null);
  useAnalytics(selectedTriplet, selection.basinHuc);

  const handleStationClick = (triplet: string) => {
    if (isMobile) setSidebarOpen(false);
    selection.selectStation(triplet);
  };

  const handleBasinClick = (huc: string) => {
    if (isMobile) setSidebarOpen(false);
    selection.selectBasin(huc);
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOverlayVisible(Boolean(selectedTriplet || selection.basinHuc)));
    return () => cancelAnimationFrame(frame);
  }, [selectedTriplet, selection.basinHuc]);

  const hasDetailPanel = selectedTriplet !== null || selectedBasin !== null;
  const sidebarOffset = !isMobile && sidebarOpen ? SIDEBAR_WIDTH + SIDEBAR_INSET * 2 : 0;
  const expanded = useStoredValue(expandedStore);
  const toggleExpand = isMobile ? undefined : () => expandedStore.set((v) => !v);
  const detailWidth = expanded ? `min(${EXPANDED_DETAIL_MAX}px, calc(100vw - ${(sidebarOffset || SIDEBAR_INSET) + SIDEBAR_INSET}px))` : DETAIL_WIDTH;

  const detailContent = selectedTriplet ? (
    <StationDetailPanel
      triplet={selectedTriplet}
      onClose={selection.clear}
      onStationClick={handleStationClick}
      isFavorite={isStationFav(selectedTriplet)}
      onToggleFavorite={() => toggleStation(selectedTriplet)}
      expanded={expanded}
      onToggleExpand={toggleExpand}
    />
  ) : selectedBasin ? (
    <BasinDetailPanel
      basin={selectedBasin}
      onClose={selection.clear}
      onStationClick={handleStationClick}
      isFavorite={isBasinFav(selectedBasin.huc)}
      onToggleFavorite={() => toggleBasin(selectedBasin.huc)}
      expanded={expanded}
      onToggleExpand={toggleExpand}
    />
  ) : null;

  const sidebarContent = (
    <MapSidebar
      stationCount={filteredStations.length}
      isMobile={isMobile}
      basins={allBasins}
      controls={controls}
      onClose={() => setSidebarOpen(false)}
      onSearch={openSearch}
      onSelectStation={handleStationClick}
      onSelectBasin={handleBasinClick}
    />
  );

  return (
    <div className="h-dvh flex w-full relative">
      {sidebarOpen && (isMobile ? (
        <BottomSheet baseHeight="72dvh" onDismiss={() => setSidebarOpen(false)} zIndex={30} background="var(--c-sheet)">
          {sidebarContent}
        </BottomSheet>
      ) : (
        <div
          className="absolute z-20 rounded-2xl flex flex-col overflow-hidden"
          style={{ ...GLASS_STYLE, width: SIDEBAR_WIDTH, top: SIDEBAR_INSET, left: SIDEBAR_INSET, bottom: SIDEBAR_INSET }}
        >
          {sidebarContent}
        </div>
      ))}

      {!sidebarOpen && (
        <div className="absolute z-20 flex items-center gap-0.5 p-0.5 rounded-xl" style={{ ...GLASS_STYLE, top: SIDEBAR_INSET, left: SIDEBAR_INSET }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center gap-2 h-10 md:h-8 pl-3 pr-3.5 md:p-0 md:w-8 rounded-lg hover:bg-[var(--c-hover)] transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <SlidersHorizontal size={16} className="md:hidden" style={{ color: theme.darkGray }} />
            <span className="md:hidden text-[13px] font-sans font-semibold" style={{ color: theme.darkGray }}>Layers</span>
            <ChevronRight size={16} className="hidden md:block" style={{ color: theme.gray }} />
          </button>
          <button
            onClick={openSearch}
            className="flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-lg hover:bg-[var(--c-hover)] transition-colors cursor-pointer"
            aria-label="Search"
          >
            <Search size={15} style={{ color: theme.gray }} />
          </button>
        </div>
      )}

      <div
        className="flex-1 relative min-w-0"
        style={{ "--map-right-inset": !isMobile && hasDetailPanel ? `calc(${detailWidth} + ${SIDEBAR_INSET}px)` : "0px" } as React.CSSProperties}
      >
        <StationMap
          key={dark ? "dark" : "light"}
          dark={dark}
          stations={filteredStations}
          huc2Markers={huc2Markers}
          huc4Markers={huc4Markers}
          showStations={controls.showStations}
          showHuc2={controls.showHuc2}
          showHuc4={controls.showHuc4}
          metric={metric}
          onStationSelect={handleStationClick}
          onBasinSelect={handleBasinClick}
          spots={spots}
          showSpots={controls.showSpots}
          selectedStates={selectedStateList}
          selectedTriplet={selectedTriplet}
          initialBounds={homeBounds}
          fitPadding={{ top: 48, right: 48, bottom: 48, left: sidebarOffset + 48 }}
        />

        {(loading || stale) && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 h-8 px-3 rounded-full pointer-events-none"
            style={GLASS_STYLE}
          >
            <Loader2 className="animate-spin" size={13} style={{ color: theme.gray }} />
            <span className="text-xs font-sans font-medium" style={{ color: theme.darkGray }}>Updating conditions…</span>
          </div>
        )}

        <MapLegend metric={metric} dataDate={dataDate} activeOnly={controls.activeOnly} isMobile={isMobile} left={sidebarOffset || undefined} />
      </div>

      {hasDetailPanel && (isMobile ? (
        <BottomSheet baseHeight="85dvh" onDismiss={selection.clear} dimBackdrop handleTone="light" zIndex={60} background={theme.white}>
          {detailContent}
        </BottomSheet>
      ) : (
        <div
          className="absolute z-30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200"
          style={{
            top: SIDEBAR_INSET,
            right: SIDEBAR_INSET,
            bottom: SIDEBAR_INSET,
            width: detailWidth,
            background: theme.white,
            border: `1px solid ${theme.borderGray}`,
            opacity: overlayVisible ? 1 : 0,
            transform: overlayVisible ? "translateX(0)" : "translateX(24px)",
          }}
        >
          {detailContent}
        </div>
      ))}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}
