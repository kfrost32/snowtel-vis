"use client";

import { useState, useEffect } from "react";
import { urlTriplet } from "@/lib/stations";

interface EnvelopeDay {
  wyDay: number;
  min: number | null;
  max: number | null;
  median: number | null;
  p10: number | null;
  p90: number | null;
}

interface YearTrace {
  waterYear: number;
  data: { wyDay: number; swe: number }[];
}

export interface EnvelopeData {
  envelope: EnvelopeDay[];
  years: YearTrace[];
  currentYear: number;
}

export function useEnvelopeData(triplet: string) {
  const [data, setData] = useState<EnvelopeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const encoded = urlTriplet(triplet);
        const res = await fetch(`/api/stations/${encoded}/envelope`);
        if (!res.ok) throw new Error("Failed to fetch envelope data");
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
