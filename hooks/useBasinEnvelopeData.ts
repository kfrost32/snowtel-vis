"use client";

import { useState, useEffect } from "react";
import type { EnvelopeData } from "@/hooks/useEnvelopeData";

export function useBasinEnvelopeData(huc: string) {
  const [data, setData] = useState<EnvelopeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);

    async function load() {
      try {
        const res = await fetch(`/api/basins/${encodeURIComponent(huc)}/envelope`);
        if (!res.ok) throw new Error("Failed to fetch basin envelope data");
        const result = await res.json();
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [huc]);

  return { data, loading, error };
}
