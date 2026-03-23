"use client";

import { useState, useEffect } from "react";
import type { StationSeasonData } from "@/lib/types";
import { urlTriplet } from "@/lib/stations";

export function useSeasonData(triplet: string) {
  const [data, setData] = useState<StationSeasonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const encoded = urlTriplet(triplet);
        const res = await fetch(`/api/stations/${encoded}`);
        if (!res.ok) throw new Error("Failed to fetch season data");
        const result = await res.json();
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [triplet]);

  return { data, loading, error };
}
