import { after } from "next/server";
import type { ApiResponse } from "@snotel/core/types";
import { readSnapshot, writeSnapshots, type Snapshot } from "./snapshot-store";

const MEMO_MS = 5 * 60 * 1000;
const MEMO_MAX_ENTRIES = 200;
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

const memo = new Map<string, { snapshot: Snapshot<unknown>; readAt: number }>();
const inFlight = new Map<string, Promise<Snapshot<unknown>>>();
const failedAt = new Map<string, number>();

function remember(key: string, snapshot: Snapshot<unknown>): void {
  memo.delete(key);
  memo.set(key, { snapshot, readAt: Date.now() });
  if (memo.size > MEMO_MAX_ENTRIES) memo.delete(memo.keys().next().value!);
}

async function read<T>(key: string): Promise<Snapshot<T> | null> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.readAt < MEMO_MS) return hit.snapshot as Snapshot<T>;
  const stored = await readSnapshot<T>(key);
  const snapshot = stored && (!hit || stored.fetchedAt >= hit.snapshot.fetchedAt) ? stored : (hit?.snapshot as Snapshot<T>) ?? null;
  if (snapshot) remember(key, snapshot);
  return snapshot;
}

function refresh<T>(key: string, load: (previous: T | null) => Promise<T>, previous: T | null): Promise<Snapshot<T>> {
  let pending = inFlight.get(key);
  if (!pending) {
    pending = load(previous)
      .then(async (data) => {
        const snapshot = { data, fetchedAt: Date.now() };
        remember(key, snapshot);
        failedAt.delete(key);
        await writeSnapshots({ [key]: snapshot }).catch((e) => console.error(`Snapshot write failed for ${key}:`, (e as Error).message));
        return snapshot;
      })
      .catch((e) => {
        failedAt.set(key, Date.now());
        throw e;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending as Promise<Snapshot<T>>;
}

export async function getSnapshot<T>({
  key,
  maxAge,
  load,
  waitMs,
}: {
  key: string;
  maxAge: number;
  load: (previous: T | null) => Promise<T>;
  waitMs?: number;
}): Promise<ApiResponse<T>> {
  const snapshot = await read<T>(key);
  if (snapshot && Date.now() - snapshot.fetchedAt < maxAge) return { ...snapshot, stale: false };
  if (snapshot && Date.now() - (failedAt.get(key) ?? 0) < RETRY_AFTER_FAILURE_MS) return { ...snapshot, stale: true };

  const live = refresh(key, load, snapshot?.data ?? null);
  if (!snapshot) return { ...(await live), stale: false };
  try {
    const timeout = waitMs === undefined ? null : new Promise<null>((resolve) => setTimeout(() => resolve(null), waitMs));
    const fresh = await (timeout ? Promise.race([live, timeout]) : live);
    if (fresh) return { ...fresh, stale: false };
    after(() => live.catch((e) => console.error(`Refresh failed for ${key}:`, (e as Error).message)));
  } catch (e) {
    console.error(`Refresh failed for ${key}:`, (e as Error).message);
  }
  return { ...snapshot, stale: true };
}
