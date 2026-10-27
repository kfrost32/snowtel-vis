"use client";

import { useEffect } from "react";

const DEFAULT_TITLE = "snotel.fyi · SNOTEL snowpack map";

export function usePageTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · snotel.fyi` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
