"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const SLOP = 8;
const SNAP_DISTANCE = 80;
const FLICK_VELOCITY = 0.5;
const VELOCITY_WINDOW_MS = 100;
const FULL_HEIGHT = "100dvh - 48px";
const EASE = "transform 300ms cubic-bezier(0.32, 0.72, 0, 1), height 300ms cubic-bezier(0.32, 0.72, 0, 1)";

interface BottomSheetProps {
  baseHeight: string;
  onDismiss: () => void;
  dimBackdrop?: boolean;
  handleTone?: "light" | "dark";
  zIndex: number;
  background: string;
  className?: string;
  children: ReactNode;
}

function scrolledAncestor(target: EventTarget | null, root: HTMLElement): HTMLElement | null {
  for (let el = target as HTMLElement | null; el && el !== root; el = el.parentElement) {
    if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY)) return el;
  }
  return null;
}

export default function BottomSheet({
  baseHeight,
  onDismiss,
  dimBackdrop = false,
  handleTone = "dark",
  zIndex,
  background,
  className = "",
  children,
}: BottomSheetProps) {
  const [visible, setVisible] = useState(false);
  const [full, setFull] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const suppressTap = useRef(false);
  const state = useRef({ full, onDismiss });

  useEffect(() => {
    state.current = { full, onDismiss };
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    let start: { x: number; y: number; t: number; scroller: HTMLElement | null } | null = null;
    let dragging = false;
    let samples: { y: number; t: number }[] = [];

    const onStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (e.touches.length !== 1 || target.closest("input[type=range], [data-sheet-no-drag]")) return;
      const touch = e.touches[0];
      start = { x: touch.clientX, y: touch.clientY, t: e.timeStamp, scroller: scrolledAncestor(target, sheet) };
      dragging = false;
      suppressTap.current = false;
      samples = [{ y: touch.clientY, t: e.timeStamp }];
    };

    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const touch = e.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (!dragging) {
        const atTop = !start.scroller || start.scroller.scrollTop <= 0;
        if (dy > 0 && atTop && Math.abs(dy) >= Math.abs(dx)) e.preventDefault();
        if (Math.abs(dy) < SLOP || Math.abs(dy) < Math.abs(dx)) return;
        const canDrag = dy > 0 ? atTop : !state.current.full && !start.scroller;
        if (!canDrag) {
          start = null;
          return;
        }
        dragging = true;
        sheet.style.transition = "none";
      }
      e.preventDefault();
      const offset = dy - Math.sign(dy) * SLOP;
      if (offset > 0) sheet.style.transform = `translateY(${offset}px)`;
      else sheet.style.height = `min(calc(${FULL_HEIGHT}), calc(${state.current.full ? FULL_HEIGHT : baseHeight} + ${-offset}px))`;
      samples.push({ y: touch.clientY, t: e.timeStamp });
      samples = samples.filter((sample) => e.timeStamp - sample.t <= VELOCITY_WINDOW_MS);
    };

    const onEnd = () => {
      if (!start) return;
      const first = samples[0];
      const latest = samples[samples.length - 1];
      const dy = latest.y - start.y;
      const velocity = latest.t > first.t ? (latest.y - first.y) / (latest.t - first.t) : 0;
      const wasDragging = dragging;
      start = null;
      dragging = false;
      if (!wasDragging) return;
      sheet.style.transition = EASE;
      sheet.style.transform = "";
      sheet.style.height = "";
      suppressTap.current = true;
      const down = dy > 0 && (dy > SNAP_DISTANCE || velocity > FLICK_VELOCITY);
      const up = dy < 0 && (dy < -SNAP_DISTANCE || velocity < -FLICK_VELOCITY);
      if (down) {
        if (state.current.full) setFull(false);
        else state.current.onDismiss();
      } else if (up) setFull(true);
    };

    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd);
    sheet.addEventListener("touchcancel", onEnd);
    return () => {
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
      sheet.removeEventListener("touchcancel", onEnd);
    };
  }, [baseHeight]);

  const height = full ? FULL_HEIGHT : baseHeight;

  return (
    <>
      <div
        onClick={onDismiss}
        className="fixed inset-0 cursor-pointer transition-opacity duration-300"
        style={{ zIndex, background: dimBackdrop ? "rgba(15, 23, 42, 0.4)" : "transparent", opacity: visible ? 1 : 0 }}
      />
      <div
        ref={sheetRef}
        className={`fixed inset-x-0 bottom-0 rounded-t-2xl overflow-hidden shadow-2xl flex flex-col overscroll-contain ${className}`}
        style={{ zIndex, background, height: `calc(${height})`, transform: visible ? "translateY(0)" : "translateY(100%)", transition: EASE }}
      >
        <button
          type="button"
          onClick={() => {
            if (suppressTap.current) suppressTap.current = false;
            else setFull((f) => !f);
          }}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-24 h-6 flex justify-center pt-2 cursor-grab"
          aria-label={full ? "Collapse sheet" : "Expand sheet"}
        >
          <span
            className="w-10 h-1.5 rounded-full"
            style={
              handleTone === "light"
                ? { background: "rgba(255,255,255,0.85)", boxShadow: "0 0 0 1px rgba(15,23,42,0.15)" }
                : { background: "rgba(15,23,42,0.18)" }
            }
          />
        </button>
        {children}
      </div>
    </>
  );
}
