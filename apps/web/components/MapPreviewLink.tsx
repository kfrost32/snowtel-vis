"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Map as MapIcon } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap } from "maplibre-gl";
import { BASEMAP_STYLE_URL, BASEMAP_STYLE_URL_DARK, TERRAIN_MAXZOOM, TERRAIN_TILES, hillshadePaint, hillshadePaintDark } from "@snotel/core/map-style";
import { useIsDark } from "@/lib/settings";
import { theme } from "@/lib/theme";

type Bounds = [[number, number], [number, number]];

interface MapPreviewLinkProps {
  href: string;
  label: string;
  bounds: Bounds;
  maxZoom?: number;
  marker?: boolean;
}

export default function MapPreviewLink({ href, label, bounds, maxZoom = 8, marker = false }: MapPreviewLinkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dark = useIsDark();
  const [loaded, setLoaded] = useState(false);
  const boundsKey = JSON.stringify(bounds);

  useEffect(() => {
    let map: MapLibreMap | null = null;
    let cancelled = false;
    import("maplibre-gl").then(({ default: maplibregl }) => {
      if (cancelled || !containerRef.current) return;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: dark ? BASEMAP_STYLE_URL_DARK : BASEMAP_STYLE_URL,
        bounds: JSON.parse(boundsKey) as Bounds,
        fitBoundsOptions: { padding: 32, maxZoom },
        interactive: false,
        attributionControl: false,
      });
      map.on("load", () => {
        map?.addSource("terrain-dem", { type: "raster-dem", tiles: TERRAIN_TILES, encoding: "terrarium", tileSize: 256, maxzoom: TERRAIN_MAXZOOM });
        map?.addLayer({ id: "hillshade", type: "hillshade", source: "terrain-dem", paint: dark ? hillshadePaintDark : hillshadePaint });
        setLoaded(true);
      });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [boundsKey, maxZoom, dark]);

  return (
    <div className="group relative h-44 sm:h-56 overflow-hidden rounded-lg border" style={{ borderColor: theme.borderGray, background: theme.lightGray }}>
      <div ref={containerRef} aria-hidden className={`absolute inset-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`} />
      {marker && (
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] shadow-md"
          style={{ background: theme.black, borderColor: theme.white }}
        />
      )}
      <Link href={href} className="absolute inset-0 flex items-end p-3 sm:p-4">
        <span
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium shadow-md transition-transform duration-150 group-hover:-translate-y-0.5"
          style={{ background: theme.accent, color: theme.onAccent }}
        >
          <MapIcon size={16} />
          {label}
          <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </Link>
      <div className="absolute bottom-1 right-2 text-[10px] font-sans" style={{ color: theme.gray }}>
        <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="hover:underline">© CARTO</a>
        {" · "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">© OpenStreetMap</a>
      </div>
    </div>
  );
}
