import Constants from "expo-constants";

export const API_BASE: string = Constants.expoConfig?.extra?.apiBase ?? "https://snotel.hereandthere.club";

export async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export function webUrl(path: string): string {
  return `${API_BASE}${path}`;
}
