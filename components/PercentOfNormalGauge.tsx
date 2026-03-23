"use client";

import { getConditionColor } from "@/lib/colors";

interface PercentOfNormalGaugeProps {
  value: number | null;
  size?: number;
}

export default function PercentOfNormalGauge({ value, size = 120 }: PercentOfNormalGaugeProps) {
  const color = getConditionColor(value);
  const displayValue = value !== null ? Math.round(value) : null;

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 16) / 2;
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;

  const clampedValue = value !== null ? Math.min(Math.max(value, 0), 200) : 0;
  const fillAngle = startAngle + (clampedValue / 200) * totalAngle;

  const toXY = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const bgStart = toXY(startAngle);
  const bgEnd = toXY(endAngle);
  const fillStart = toXY(startAngle);
  const fillEnd = toXY(fillAngle);

  const bgArc = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 1 1 ${bgEnd.x} ${bgEnd.y}`;
  const fillAngleDelta = fillAngle - startAngle;
  const largeArc = fillAngleDelta > 180 ? 1 : 0;
  const fillArc = `M ${fillStart.x} ${fillStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={bgArc} fill="none" stroke="#E2E8F0" strokeWidth={8} strokeLinecap="round" />
        {value !== null && (
          <path d={fillArc} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-sans font-semibold tracking-tighter"
          style={{ fontSize: size * 0.25, color }}
        >
          {displayValue !== null ? `${displayValue}%` : "—"}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#8A9BA3" }}>
          of normal
        </span>
      </div>
    </div>
  );
}
