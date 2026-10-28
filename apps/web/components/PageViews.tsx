"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function virtualPath(pathname: string, params: URLSearchParams): string {
  if (pathname !== "/") return pathname;
  const station = params.get("station");
  if (station) return `/station/${station}`;
  const basin = params.get("basin");
  if (basin) return `/region/${basin}`;
  return pathname;
}

export default function PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string | null>(null);
  const path = virtualPath(pathname, searchParams);

  useEffect(() => {
    if (path === lastPath.current) return;
    const timer = setTimeout(() => {
      lastPath.current = path;
      window.gtag?.("event", "page_view", {
        page_location: `${window.location.origin}${path}`,
        page_title: document.title,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [path]);

  return null;
}
