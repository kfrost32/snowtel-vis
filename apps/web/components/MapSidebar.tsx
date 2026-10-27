"use client";

import { ArrowUpRight, ChevronLeft, Search, Settings, X } from "lucide-react";
import { theme } from "@/lib/theme";
import { getStation } from "@snotel/core/stations";
import type { BasinSummary } from "@snotel/core/types";
import MapControls, { type MapControlsProps } from "@/components/MapControls";
import SettingsPanel from "@/components/SettingsPanel";
import { memoryValue, useStoredValue } from "@/lib/stored-value";
import { SidebarFavoriteItem, SidebarSection } from "@/components/sidebar";
import { useFavorites } from "@/hooks/useFavorites";

const settingsOpen = memoryValue(false);
const NEWSLETTER_URL = "https://read.hereandthere.club/subscribe";

interface MapSidebarProps {
  stationCount: number;
  isMobile: boolean;
  basins: BasinSummary[];
  controls: MapControlsProps;
  onClose: () => void;
  onSearch: () => void;
  onSelectStation: (triplet: string) => void;
  onSelectBasin: (huc: string) => void;
}

export default function MapSidebar({ stationCount, isMobile, basins, controls, onClose, onSearch, onSelectStation, onSelectBasin }: MapSidebarProps) {
  const { favorites, toggleStation, toggleBasin } = useFavorites();
  const showSettings = useStoredValue(settingsOpen);
  const hasFavorites = favorites.stations.length > 0 || favorites.basins.length > 0;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2.5 max-md:py-3 border-b flex-shrink-0" style={{ borderColor: "var(--c-hairline)" }}>
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight font-sans truncate" style={{ color: theme.black }}>
            snotel.fyi
          </div>
          <div className="text-xs font-mono" style={{ color: theme.mediumGray }}>
            {`${stationCount} stations`}
          </div>
        </div>
        <div className="flex items-center gap-0.5 max-md:gap-2 shrink-0">
          <button onClick={onSearch} className="max-md:hidden p-1.5 rounded-md hover:bg-[var(--c-hover)] transition-colors cursor-pointer" aria-label="Search">
            <Search size={16} style={{ color: theme.gray }} />
          </button>
          <button
            onClick={() => settingsOpen.set((open) => !open)}
            className="p-1.5 rounded-md max-md:flex max-md:items-center max-md:justify-center max-md:size-10 max-md:p-0 max-md:rounded-full max-md:bg-[var(--c-hairline)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer"
            style={{ background: showSettings ? "var(--c-hover)" : undefined }}
            aria-label="Settings"
            aria-pressed={showSettings}
          >
            <Settings size={16} className="max-md:size-5" style={{ color: showSettings ? theme.black : theme.gray }} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md max-md:flex max-md:items-center max-md:gap-1.5 max-md:h-10 max-md:pl-3 max-md:pr-4 max-md:rounded-full max-md:bg-[var(--c-hairline)] hover:bg-[var(--c-hover)] transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            {isMobile ? (
              <>
                <X size={18} style={{ color: theme.darkGray }} />
                <span className="text-sm font-sans font-semibold" style={{ color: theme.darkGray }}>Close</span>
              </>
            ) : (
              <ChevronLeft size={16} style={{ color: theme.gray }} />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col " style={{ borderColor: theme.borderGray }}>
        {showSettings ? (
          <SettingsPanel />
        ) : (
          <>
            {hasFavorites && (
              <div className="max-md:order-last">
                <SidebarSection label="Favorites" flush>
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
            )}

            <MapControls {...controls} />
          </>
        )}

        <a
          href={NEWSLETTER_URL}
          target="_blank"
          rel="noopener"
          className="group mt-auto max-md:order-last px-4 py-3 max-md:py-5 text-xs max-md:text-sm font-sans flex items-center gap-1 transition-colors"
          style={{ color: theme.mediumGray }}
        >
          <span>
            A <span className="group-hover:underline underline-offset-2" style={{ color: theme.gray }}>Here &amp; There</span> project · Get the newsletter
          </span>
          <ArrowUpRight size={12} className="max-md:size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
    </>
  );
}
