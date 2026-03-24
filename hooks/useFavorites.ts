"use client";

import { useState, useEffect } from "react";

interface Favorites {
  stations: string[];
  basins: string[];
}

const STORAGE_KEY = "snotel_favorites";
const EMPTY: Favorites = { stations: [], basins: [] };

function load(): Favorites {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      stations: Array.isArray(parsed.stations) ? parsed.stations : [],
      basins: Array.isArray(parsed.basins) ? parsed.basins : [],
    };
  } catch {
    return EMPTY;
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorites>(EMPTY);

  useEffect(() => {
    setFavorites(load());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleStation = (triplet: string) => {
    setFavorites((prev) => ({
      ...prev,
      stations: prev.stations.includes(triplet)
        ? prev.stations.filter((t) => t !== triplet)
        : [...prev.stations, triplet],
    }));
  };

  const toggleBasin = (huc: string) => {
    setFavorites((prev) => ({
      ...prev,
      basins: prev.basins.includes(huc)
        ? prev.basins.filter((h) => h !== huc)
        : [...prev.basins, huc],
    }));
  };

  const isStationFav = (triplet: string) => favorites.stations.includes(triplet);
  const isBasinFav = (huc: string) => favorites.basins.includes(huc);

  return { favorites, toggleStation, toggleBasin, isStationFav, isBasinFav };
}
