"use client";

import { useEffect, useState, useRef } from "react";
import { theme } from "@/lib/theme";

interface StatCardProps {
  label: string;
  value: string;
  size?: "default" | "small";
  subtitle?: {
    text: string;
    color: string;
  };
  labelAdornment?: React.ReactNode;
}

function parseValue(value: string): { prefix: string; number: number; suffix: string } | null {
  const match = value.match(/^([^0-9\-]*)(-?[0-9]+\.?[0-9]*)(.*)$/);
  if (!match) return null;
  return { prefix: match[1], number: parseFloat(match[2]), suffix: match[3] };
}

function formatNumber(n: number, decimals: number): string {
  return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
}

export default function StatCard({ label, value, size = "default", subtitle, labelAdornment }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animate, setAnimate] = useState(false);
  const frameRef = useRef<number>(undefined);
  const currentNumberRef = useRef<number | null>(null);

  useEffect(() => {
    setAnimate(false);
    const timer = setTimeout(() => setAnimate(true), 10);
    return () => clearTimeout(timer);
  }, [value, subtitle?.text]);

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const parsed = parseValue(value);
    if (!parsed || value === "—") {
      setDisplayValue(value);
      return;
    }

    const { prefix, number: target, suffix } = parsed;
    const decimals = (target.toString().split(".")[1] ?? "").length;
    const from = currentNumberRef.current ?? target * 0.6;
    const duration = 800;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + eased * (target - from);
      currentNumberRef.current = current;
      setDisplayValue(`${prefix}${formatNumber(current, decimals)}${suffix}`);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value]);

  const isSmall = size === "small";

  return (
    <div
      className={`${isSmall ? "p-3" : "p-4 sm:p-6"} rounded-lg border`}
      style={{
        background: theme.offWhite,
        borderColor: theme.borderGray,
      }}
    >
      <div
        className="text-xs mb-1.5 uppercase tracking-wide font-mono flex items-center gap-1"
        style={{ color: theme.gray }}
      >
        {label}{labelAdornment}
      </div>
      <div
        className={`${isSmall ? "text-xl" : "text-2xl sm:text-3xl md:text-4xl"} font-semibold font-sans tracking-tighter`}
        style={{
          color: theme.black,
          opacity: animate ? 1 : 0,
          transform: animate ? "scale(1)" : "scale(0.98)",
          transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
        }}
      >
        {displayValue}
      </div>
      {subtitle && (
        <div
          className="text-xs mt-1.5 line-clamp-2 font-mono"
          style={{
            color: subtitle.color,
            opacity: animate ? 1 : 0,
            transition: "opacity 0.4s ease-out 0.1s",
          }}
        >
          {subtitle.text}
        </div>
      )}
    </div>
  );
}
