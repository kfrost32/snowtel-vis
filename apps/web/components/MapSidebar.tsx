"use client";

import { ChevronLeft, Search, X } from "lucide-react";
import { theme } from "@snotel/core/theme";
import { getStation } from "@snotel/core/stations";
import type { BasinSummary } from "@snotel/core/types";
import MapControls, { type MapControlsProps } from "@/components/MapControls";
import { SidebarFavoriteItem, SidebarSection } from "@/components/sidebar";
import { useFavorites } from "@/hooks/useFavorites";

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
  const hasFavorites = favorites.stations.length > 0 || favorites.basins.length > 0;

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-6 pb-2.5 md:pt-2.5 border-b flex-shrink-0" style={{ borderColor: "rgba(15, 23, 42, 0.06)" }}>
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight font-sans truncate" style={{ color: theme.black }}>
            SNOTEL Explorer
          </div>
          <div className="text-[10px] font-mono" style={{ color: theme.mediumGray }}>
            {`${stationCount} stations`}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onSearch} className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-black/[0.05] transition-colors cursor-pointer" aria-label="Search">
            <Search size={14} style={{ color: theme.gray }} />
            <kbd className="hidden md:inline font-mono text-[10px] leading-none" style={{ color: theme.mediumGray }}>⌘K</kbd>
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-black/[0.05] transition-colors cursor-pointer" aria-label="Close sidebar">
            {isMobile ? <X size={18} style={{ color: theme.gray }} /> : <ChevronLeft size={16} style={{ color: theme.gray }} />}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col max-md:pb-[calc(env(safe-area-inset-bottom)+32px)]" style={{ borderColor: theme.borderGray }}>
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
      </div>
    </>
  );
}
