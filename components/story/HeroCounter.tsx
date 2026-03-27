"use client";

import { useEffect, useState, useRef } from "react";
import { theme } from "@/lib/theme";

interface HeroCounterProps {
  value: number;
  suffix?: string;
  label: string;
}

export default function HeroCounter({ value, suffix = "%", label }: HeroCounterProps) {
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const frameRef = useRef<number>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!started) return;
    const duration = 1200;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [started, value]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="font-sans font-bold tracking-tighter leading-none"
        style={{
          fontSize: "clamp(5rem, 15vw, 12rem)",
          color: theme.white,
          opacity: started ? 1 : 0,
          transform: started ? "scale(1)" : "scale(0.95)",
          transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        }}
      >
        {display}
        <span style={{ fontSize: "0.6em" }}>{suffix}</span>
      </div>
      <p
        className="font-sans text-lg sm:text-xl md:text-2xl text-center max-w-xl"
        style={{
          color: theme.mediumGray,
          opacity: started ? 1 : 0,
          transition: "opacity 0.8s ease-out 0.4s",
        }}
      >
        {label}
      </p>
    </div>
  );
}
