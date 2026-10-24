"use client";

import { useEffect } from "react";

const DEFAULT_TITLE = "SNOTEL Explorer";

export function usePageTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} — SNOTEL Explorer` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
