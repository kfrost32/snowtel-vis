export const GA_ID = "G-EJ3PWVEFW1";

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, params?: EventParams): void {
  if (typeof window !== "undefined") window.gtag?.("event", event, params);
}
