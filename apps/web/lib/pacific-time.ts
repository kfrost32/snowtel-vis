export const PACIFIC_OFFSET_MS = 8 * 3600_000;

export function pacificDateTime(ms: number): string {
  return new Date(ms - PACIFIC_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ");
}

export function pacificToday(): string {
  return pacificDateTime(Date.now()).slice(0, 10);
}
