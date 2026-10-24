"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function useAnalytics(selectedStation: string | null, selectedBasin: string | null) {
  useEffect(() => {
    if (!window.gtag) return;
    if (selectedStation) {
      window.gtag("event", "page_view", {
        page_title: document.title,
        page_location: window.location.href,
        content_type: "station",
        content_id: selectedStation,
      });
    } else if (selectedBasin) {
      window.gtag("event", "page_view", {
        page_title: document.title,
        page_location: window.location.href,
        content_type: "basin",
        content_id: selectedBasin,
      });
    }
  }, [selectedStation, selectedBasin]);
}
