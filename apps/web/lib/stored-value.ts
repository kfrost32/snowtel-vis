"use client";

import { useSyncExternalStore } from "react";

export interface StoredValue<T> {
  subscribe: (listener: () => void) => () => void;
  read: () => T;
  fallback: T;
  set: (update: T | ((prev: T) => T)) => void;
}

export function storedValue<T>(key: string, fallback: T, parse: (raw: string) => T): StoredValue<T> {
  let value: T | undefined;
  const listeners = new Set<() => void>();
  const read = (): T => {
    if (value === undefined) {
      try {
        const raw = localStorage.getItem(key);
        value = raw === null ? fallback : parse(raw);
      } catch {
        value = fallback;
      }
    }
    return value;
  };
  return {
    fallback,
    read,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (update) => {
      value = typeof update === "function" ? (update as (prev: T) => T)(read()) : update;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
      listeners.forEach((listener) => listener());
    },
  };
}

export function memoryValue<T>(fallback: T): StoredValue<T> {
  let value = fallback;
  const listeners = new Set<() => void>();
  return {
    fallback,
    read: () => value,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (update) => {
      value = typeof update === "function" ? (update as (prev: T) => T)(value) : update;
      listeners.forEach((listener) => listener());
    },
  };
}

export function useStoredValue<T>(store: StoredValue<T>): T {
  return useSyncExternalStore(store.subscribe, store.read, () => store.fallback);
}
