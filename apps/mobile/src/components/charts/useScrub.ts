import { useMemo, useRef, useState } from "react";
import { PanResponder } from "react-native";
import * as Haptics from "expo-haptics";

export function useScrub(indexAt: (x: number) => number) {
  const [index, setIndex] = useState<number | null>(null);
  const last = useRef<number | null>(null);
  const indexAtRef = useRef(indexAt);
  indexAtRef.current = indexAt;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          Haptics.selectionAsync();
          last.current = indexAtRef.current(e.nativeEvent.locationX);
          setIndex(last.current);
        },
        onPanResponderMove: (e) => {
          const i = indexAtRef.current(e.nativeEvent.locationX);
          if (i === last.current) return;
          last.current = i;
          setIndex(i);
        },
        onPanResponderRelease: () => setIndex(null),
        onPanResponderTerminate: () => setIndex(null),
      }),
    []
  );

  return { index, handlers: responder.panHandlers };
}

export function niceScale(min: number, max: number, ticks = 4): { min: number; max: number; step: number } {
  const span = Math.max(max - min, 1);
  const raw = span / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step };
}

export function linePath(points: ({ x: number; y: number } | null)[]): string {
  let d = "";
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    pen = true;
  }
  return d;
}
