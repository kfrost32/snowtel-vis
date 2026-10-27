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
  const [initial] = useState(() => stationFromParams(searchParams));
  const [triplet, setTriplet] = useState<string | null>(initial);
  const [basinHuc, setBasinHuc] = useState<string | null>(() => searchParams.get("basin"));
  const [focus, setFocus] = useState<{ triplet: string } | null>(initial ? { triplet: initial } : null);
  const [prevSearchParams, setPrevSearchParams] = useState(searchParams);
  if (searchParams !== prevSearchParams) {
    const next = stationFromParams(searchParams);
    setPrevSearchParams(searchParams);
    setTriplet(next);
    setBasinHuc(searchParams.get("basin") ?? null);
    if (next && next !== triplet) setFocus({ triplet: next });
  }

  const selectStation = useCallback((next: string) => {
    setTriplet(next);
    setBasinHuc(null);
  }, []);

  const focusStation = useCallback((next: string) => {
    setTriplet(next);
    setBasinHuc(null);
    setFocus({ triplet: next });
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

  return { triplet, basinHuc, focus, selectStation, focusStation, selectBasin, clear };
}
