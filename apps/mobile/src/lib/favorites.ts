import { useSyncExternalStore } from "react";
import Storage from "expo-sqlite/kv-store";

const KEY = "favorites:stations";
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    return JSON.parse(Storage.getItemSync(KEY) ?? "[]");
  } catch {
    return [];
  }
}

let snapshot = read();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleFavorite(triplet: string) {
  snapshot = snapshot.includes(triplet) ? snapshot.filter((t) => t !== triplet) : [...snapshot, triplet];
  Storage.setItemSync(KEY, JSON.stringify(snapshot));
  listeners.forEach((l) => l());
}

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, () => snapshot);
}

export function useIsFavorite(triplet: string): boolean {
  return useFavorites().includes(triplet);
}
