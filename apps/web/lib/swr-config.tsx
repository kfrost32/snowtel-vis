"use client";

import { useEffect, useState } from "react";
import { SWRConfig, useSWRConfig } from "swr";

const STORAGE_KEY = "snotel:swr-cache";
const PERSISTED_PREFIX = "/api/";
const MAX_PERSISTED_ENTRIES = 30;

export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
    return r.json();
  });

function readPersisted(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function PersistCache() {
  const { cache } = useSWRConfig();
  useEffect(() => {
    const save = () => {
      const entries = { ...readPersisted() };
      for (const key of cache.keys()) {
        const data = cache.get(key)?.data;
        if (!key.startsWith(PERSISTED_PREFIX) || data === undefined) continue;
        delete entries[key];
        entries[key] = data;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(Object.entries(entries).slice(-MAX_PERSISTED_ENTRIES))));
      } catch {}
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", save);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", save);
    };
  }, [cache]);
  return null;
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const [fallback, setFallback] = useState<Record<string, unknown>>({});
  useEffect(() => setFallback(readPersisted()), []);
  return (
    <SWRConfig
      value={{
        fetcher,
        fallback,
        revalidateOnFocus: false,
        dedupingInterval: 60000,
        errorRetryCount: 2,
      }}
    >
      <PersistCache />
      {children}
    </SWRConfig>
  );
}
