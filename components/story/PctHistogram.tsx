"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { theme, chartTooltipStyle, chartCursorStyle } from "@/lib/theme";
import { getConditionColor } from "@/lib/colors";

interface HistogramBin {
  bin: string;
  midpoint: number;
  count: number;
}

interface PctHistogramProps {
  bins: HistogramBin[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: HistogramBin }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={chartTooltipStyle}>
      <div className="font-mono text-[11px] font-medium" style={{ color: theme.darkGray }}>
        {d.bin}% of median
      </div>
      <div className="font-mono text-[11px]" style={{ color: theme.gray }}>
        {d.count} station{d.count !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export default function PctHistogram({ bins }: PctHistogramProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={bins} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <XAxis
          dataKey="bin"
          tick={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
          axisLine={{ stroke: theme.borderGray }}
          tickLine={false}
          interval={1}
          tickFormatter={(v: string) => `${v}%`}
        />
        <YAxis
          tick={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={chartCursorStyle} />
        <ReferenceLine x="100" stroke={theme.darkGray} strokeWidth={1.5} strokeDasharray="4 2" />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {bins.map((b) => (
            <Cell key={b.bin} fill={getConditionColor(b.midpoint)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
