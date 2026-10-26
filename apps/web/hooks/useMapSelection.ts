"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { parseTripletFromUrl, urlTriplet } from "@snotel/core/stations";

function stationFromParams(params: URLSearchParams): string | null {
  const station = params.get("station");
  return station ? parseTripletFromUrl(station) : null;
}

export function useMapSelection() {
  const searchParams = useSearchParams();
  const [triplet, setTriplet] = useState<string | null>(() => stationFromParams(searchParams));
  const [basinHuc, setBasinHuc] = useState<string | null>(() => searchParams.get("basin"));
  const [prevSearchParams, setPrevSearchParams] = useState(searchParams);
  if (searchParams !== prevSearchParams) {
    setPrevSearchParams(searchParams);
    setTriplet(stationFromParams(searchParams));
    setBasinHuc(searchParams.get("basin") ?? null);
  }

  const selectStation = useCallback((next: string) => {
    setTriplet(next);
    setBasinHuc(null);
  }, []);

  const selectBasin = useCallback((huc: string) => {
    setBasinHuc(huc);
    setTriplet(null);
  }, []);

  const clear = useCallback(() => {
    setTriplet(null);
    setBasinHuc(null);
  }, []);

  useEffect(() => {
    const qs = triplet ? `station=${urlTriplet(triplet)}` : basinHuc ? `basin=${basinHuc}` : "";
    const url = qs ? `/?${qs}` : "/";
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(null, "", url);
  }, [triplet, basinHuc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  return { triplet, basinHuc, selectStation, selectBasin, clear };
}
