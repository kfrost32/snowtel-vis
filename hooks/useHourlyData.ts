"use client";

import { useState, useEffect } from "react";
import { urlTriplet } from "@/lib/stations";
import type { HourlyObservation } from "@/app/api/stations/[triplet]/hourly/route";

export type { HourlyObservation };

export function useHourlyData(triplet: string) {
  const [data, setData] = useState<HourlyObservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const encoded = urlTriplet(triplet);
    fetch(`/api/stations/${encoded}/hourly`)
      .then((r) => r.json())
      .then((d) => { setData(Array.isArray(d) ? d : []); })
      .catch(() => { setData([]); })
      .finally(() => { setLoading(false); });
  }, [triplet]);

  return { data, loading };
}
