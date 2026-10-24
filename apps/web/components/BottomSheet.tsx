"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

const TAP_THRESHOLD = 6;
const EXPAND_THRESHOLD = -60;
const COLLAPSE_THRESHOLD = 100;
const FULL_HEIGHT = "100dvh - 48px";

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
  const dragStart = useRef<number | null>(null);
  const dragOffset = useRef(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const height = full ? FULL_HEIGHT : baseHeight;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = e.clientY;
    dragOffset.current = 0;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null || !sheetRef.current) return;
    dragOffset.current = e.clientY - dragStart.current;
    sheetRef.current.style.height = `calc(${height} - ${dragOffset.current}px)`;
  };

  const onPointerEnd = () => {
    const dy = dragOffset.current;
    dragStart.current = null;
    dragOffset.current = 0;
    if (sheetRef.current) {
      sheetRef.current.style.transition = "";
      sheetRef.current.style.height = "";
    }
    if (Math.abs(dy) < TAP_THRESHOLD) setFull((f) => !f);
    else if (dy < EXPAND_THRESHOLD) setFull(true);
    else if (dy > COLLAPSE_THRESHOLD) {
      if (full) setFull(false);
      else onDismiss();
    }
  };

  return (
    <>
      <div
        onClick={onDismiss}
        className="fixed inset-0 cursor-pointer transition-opacity duration-300"
        style={{ zIndex, background: dimBackdrop ? "rgba(15, 23, 42, 0.4)" : "transparent", opacity: visible ? 1 : 0 }}
      />
      <div
        ref={sheetRef}
        className={`fixed inset-x-0 bottom-0 rounded-t-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ease-out ${className}`}
        style={{ zIndex, background, height: `calc(${height})`, transform: visible ? "translateY(0)" : "translateY(100%)" }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-40 h-8 flex justify-center pt-2 touch-none cursor-grab"
          role="button"
          aria-label={full ? "Collapse sheet" : "Expand sheet"}
        >
          <div
            className="w-10 h-1.5 rounded-full"
            style={
              handleTone === "light"
                ? { background: "rgba(255,255,255,0.85)", boxShadow: "0 0 0 1px rgba(15,23,42,0.15)" }
                : { background: "rgba(15,23,42,0.18)" }
            }
          />
        </div>
        {children}
      </div>
    </>
  );
}
