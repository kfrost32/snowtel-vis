import { AppState } from "react-native";
import Storage from "expo-sqlite/kv-store";
import type { Cache, State } from "swr";

const STORAGE_KEY = "swr-cache";
const PERSISTED_PREFIXES = ["/api/", "/envelopes/"];
const MAX_PERSISTED_ENTRIES = 80;

function readPersisted(): [string, unknown][] {
  try {
    return JSON.parse(Storage.getItemSync(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function persistedCache(): Cache {
  const cache = new Map<string, State>(readPersisted().map(([key, data]) => [key, { data }]));
  AppState.addEventListener("change", (state) => {
    if (state !== "background") return;
    const entries = [...cache]
      .filter(([key, value]) => value.data !== undefined && PERSISTED_PREFIXES.some((p) => key.startsWith(p)))
      .map(([key, value]) => [key, value.data])
      .slice(-MAX_PERSISTED_ENTRIES);
    Storage.setItemAsync(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
  });
  return cache as Cache;
}
