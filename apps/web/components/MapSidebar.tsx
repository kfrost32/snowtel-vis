"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronLeft, PanelLeftClose, Settings, X } from "lucide-react";
import { theme } from "@/lib/theme";
import { getStation } from "@snotel/core/stations";
import type { BasinSummary } from "@snotel/core/types";
import MapControls, { type MapControlsProps } from "@/components/MapControls";
import SettingsPanel from "@/components/SettingsPanel";
import { memoryValue, useStoredValue } from "@/lib/stored-value";
import { SidebarFavoriteItem, SidebarSection } from "@/components/sidebar";
import { useFavorites } from "@/hooks/useFavorites";
import { track } from "@/lib/analytics";

const settingsOpen = memoryValue(false);
const SLIDE_IN = {
  layers: "motion-safe:animate-slide-in-left",
  settings: "motion-safe:animate-slide-in-right",
};
const NEWSLETTER_URL = "https://read.hereandthere.club/subscribe?utm_source=snotel.fyi&utm_medium=referral&utm_campaign=sidebar";
let newsletterIntroduced = false;

interface MapSidebarProps {
  stationCount: number;
  isMobile: boolean;
  basins: BasinSummary[];
  controls: MapControlsProps;
  onClose: () => void;
  onSelectStation: (triplet: string) => void;
  onSelectBasin: (huc: string) => void;
}

export default function MapSidebar({ stationCount, isMobile, basins, controls, onClose, onSelectStation, onSelectBasin }: MapSidebarProps) {
  const { favorites, toggleStation, toggleBasin } = useFavorites();
  const showSettings = useStoredValue(settingsOpen);
  const [switched, setSwitched] = useState(false);
  const [introduceNewsletter] = useState(() => !newsletterIntroduced);
  useEffect(() => {
    newsletterIntroduced = true;
  }, []);
  const view = showSettings ? "settings" : "layers";
  const enter = switched ? SLIDE_IN[view] : "";
  const showView = (settings: boolean) => {
    setSwitched(true);
    settingsOpen.set(settings);
  };
  const hasFavorites = favorites.stations.length > 0 || favorites.basins.length > 0;

  return (
    <>
      <div className="flex items-center justify-between gap-3 pl-4 pr-3 h-14 max-md:h-16 border-b flex-shrink-0" style={{ borderColor: "var(--c-hairline)" }}>
        {showSettings ? (
          <div key="settings-title" className={`relative flex-1 min-w-0 flex items-center ${enter}`}>
            <button
              onClick={() => showView(false)}
              className="relative z-10 flex items-center justify-center size-8 max-md:size-10 rounded-full bg-[var(--c-hairline)] hover:bg-[var(--c-hover)] active:scale-[0.94] transition cursor-pointer"
              aria-label="Back to layers"
              title="Back"
            >
              <ChevronLeft size={18} className="-ml-px" style={{ color: theme.darkGray }} />
            </button>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-tight font-sans pointer-events-none" style={{ color: theme.black }}>
              Settings
            </div>
          </div>
        ) : (
          <div key="layers-title" className={`min-w-0 ${enter}`}>
            <div className="text-sm font-semibold tracking-tight font-sans truncate" style={{ color: theme.black }}>
              snotel.fyi
            </div>
            <div className="text-xs font-mono" style={{ color: theme.mediumGray }}>
              {`${stationCount} stations`}
            </div>
          </div>
        )}
        <div key={`${view}-actions`} className={`flex items-center gap-1 max-md:gap-2 shrink-0 ${enter}`}>
          {!showSettings && (
            <button
              onClick={() => showView(true)}
              className="flex items-center justify-center size-8 max-md:size-10 rounded-full max-md:bg-[var(--c-hairline)] hover:bg-[var(--c-hover)] active:scale-[0.94] transition cursor-pointer"
              aria-label="Settings"
              title="Settings"
            >
              <Settings size={16} className="max-md:size-5" style={{ color: theme.gray }} />
            </button>
          )}
          {(isMobile || !showSettings) && (
            <button
              onClick={() => {
                settingsOpen.set(false);
                onClose();
              }}
              className="flex items-center justify-center size-8 rounded-full max-md:size-auto max-md:gap-1.5 max-md:h-10 max-md:pl-3 max-md:pr-4 max-md:bg-[var(--c-hairline)] hover:bg-[var(--c-hover)] active:scale-[0.94] transition cursor-pointer"
              aria-label="Close sidebar"
              title="Hide sidebar"
            >
              {isMobile ? (
                <>
                  <X size={18} style={{ color: theme.darkGray }} />
                  <span className="text-sm font-sans font-semibold" style={{ color: theme.darkGray }}>Close</span>
                </>
              ) : (
                <PanelLeftClose size={16} style={{ color: theme.gray }} />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col " style={{ borderColor: theme.borderGray }}>
        {showSettings ? (
          <div key="settings" className={enter}>
            <SettingsPanel />
          </div>
        ) : (
          <div key="layers" className={`flex flex-col ${enter}`}>
            <div className="max-md:order-last">
              <SidebarSection label="Favorites" flush>
                {!hasFavorites && (
                  <p className="px-4 pb-2 text-sm font-sans" style={{ color: theme.mediumGray }}>
                    No favorites added yet
                  </p>
                )}
                {favorites.stations.map((triplet) => {
                  const s = getStation(triplet);
                  if (!s) return null;
                  return (
                    <SidebarFavoriteItem
                      key={triplet}
                      name={s.name}
                      detail={s.state}
                      onClick={() => onSelectStation(triplet)}
                      onRemove={() => toggleStation(triplet)}
                    />
                  );
                })}
                {favorites.basins.map((huc) => {
                  const b = basins.find((basin) => basin.huc === huc);
                  if (!b) return null;
                  return <SidebarFavoriteItem key={huc} name={b.name} onClick={() => onSelectBasin(huc)} onRemove={() => toggleBasin(huc)} />;
                })}
              </SidebarSection>
            </div>

            <MapControls {...controls} />
          </div>
        )}

        <a
          href={NEWSLETTER_URL}
          target="_blank"
          rel="noopener"
          onClick={() => track("newsletter_click", { location: "sidebar" })}
          className={`group mt-auto max-md:order-last mx-3 my-3 px-3 py-2.5 rounded-lg flex items-center gap-3 bg-[var(--c-hairline)] hover:bg-[var(--c-hover)] active:scale-[0.99] transition ${introduceNewsletter ? "motion-safe:animate-tout-in" : ""}`}
        >
          <span className="min-w-0 flex-1 font-sans">
            <span className="block text-xs font-medium" style={{ color: theme.black }}>Get the Here &amp; There newsletter</span>
            <span className="block text-xs" style={{ color: theme.mediumGray }}>Writing and research for the outdoors</span>
          </span>
          <ArrowUpRight size={16} className={`shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition ${introduceNewsletter ? "motion-safe:animate-tout-nudge" : ""}`} style={{ color: theme.darkGray }} />
        </a>
      </div>
    </>
  );
}
