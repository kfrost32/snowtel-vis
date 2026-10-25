import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LocationStatus = "unknown" | "undetermined" | "granted" | "denied";

export function useUserLocation() {
  const [status, setStatus] = useState<LocationStatus>("unknown");
  const [coords, setCoords] = useState<Coordinates | null>(null);

  const locate = useCallback(async () => {
    const last = await Location.getLastKnownPositionAsync();
    if (last) setCoords(last.coords);
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoords(current.coords);
  }, []);

  const refresh = useCallback(async () => {
    const permission = await Location.getForegroundPermissionsAsync();
    const next = permission.granted ? "granted" : permission.canAskAgain ? "undetermined" : "denied";
    setStatus(next);
    if (next === "granted") await locate().catch(() => {});
  }, [locate]);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const request = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    setStatus(permission.granted ? "granted" : "denied");
    if (permission.granted) await locate().catch(() => {});
  }, [locate]);

  return { status, coords, request };
}
