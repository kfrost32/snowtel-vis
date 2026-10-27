"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const INSET = 12;

export default function MobileOverlay({ onDismiss, zIndex, children }: { onDismiss: () => void; zIndex: number; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <div
        onClick={onDismiss}
        className="fixed inset-0 transition-opacity duration-200"
        style={{ zIndex, background: "rgba(15, 23, 42, 0.35)", opacity: visible ? 1 : 0 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed rounded-2xl overflow-hidden shadow-2xl flex flex-col overscroll-contain transition-[opacity,transform] duration-200 ease-out"
        style={{
          zIndex,
          background: "var(--c-sheet)",
          top: `calc(env(safe-area-inset-top) + ${INSET}px)`,
          right: `calc(env(safe-area-inset-right) + ${INSET}px)`,
          bottom: `calc(env(safe-area-inset-bottom) + ${INSET}px)`,
          left: `calc(env(safe-area-inset-left) + ${INSET}px)`,
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.97)",
        }}
      >
        {children}
      </div>
    </>
  );
}
