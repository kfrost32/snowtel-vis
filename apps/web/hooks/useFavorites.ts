"use client";

import { storedValue, useStoredValue } from "@/lib/stored-value";
import { track } from "@/lib/analytics";

interface Favorites {
  stations: string[];
  basins: string[];
}

const STORAGE_KEY = "snotel_favorites";
const EMPTY: Favorites = { stations: [], basins: [] };

function parse(raw: string): Favorites {
  const parsed = JSON.parse(raw);
  return {
    stations: Array.isArray(parsed.stations) ? parsed.stations : [],
    basins: Array.isArray(parsed.basins) ? parsed.basins : [],
  };
}

const store = storedValue<Favorites>(STORAGE_KEY, EMPTY, parse);

export function useFavorites() {
  const favorites = useStoredValue(store);
  const setFavorites = store.set;

  const toggleStation = (triplet: string) => {
    track(favorites.stations.includes(triplet) ? "favorite_remove" : "favorite_add", { item_type: "station", item_id: triplet });
    setFavorites((prev) => ({
      ...prev,
      stations: prev.stations.includes(triplet)
        ? prev.stations.filter((t) => t !== triplet)
        : [...prev.stations, triplet],
    }));
  };

  const toggleBasin = (huc: string) => {
    track(favorites.basins.includes(huc) ? "favorite_remove" : "favorite_add", { item_type: "region", item_id: huc });
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
