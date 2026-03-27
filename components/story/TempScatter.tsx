"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { theme, chartTooltipStyle, chartCursorStyle } from "@/lib/theme";
import { getConditionColor } from "@/lib/colors";

interface ScatterPoint {
  temp: number;
  pctOfNormal: number;
  name: string;
}

interface TempScatterProps {
  data: ScatterPoint[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ScatterPoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={chartTooltipStyle}>
      <div className="font-mono text-[11px] font-medium" style={{ color: theme.darkGray }}>
        {d.name}
      </div>
      <div className="font-mono text-[11px]" style={{ color: theme.gray }}>
        {Math.round(d.temp)}°F / {Math.round(d.pctOfNormal)}% of normal
      </div>
    </div>
  );
}

export default function TempScatter({ data }: TempScatterProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: -4 }}>
        <XAxis
          type="number"
          dataKey="temp"
          name="Temperature"
          tick={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
          axisLine={{ stroke: theme.borderGray }}
          tickLine={false}
          tickFormatter={(v: number) => `${v}°F`}
          label={{ value: "Temperature", position: "insideBottom", offset: -2, fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
        />
        <YAxis
          type="number"
          dataKey="pctOfNormal"
          name="% of Normal"
          tick={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
          label={{ value: "% of Normal", angle: -90, position: "insideLeft", offset: 16, fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
        />
        <Tooltip content={<CustomTooltip />} cursor={chartCursorStyle} />
        <ReferenceLine y={100} stroke={theme.darkGray} strokeWidth={1} strokeDasharray="4 2" />
        <ReferenceLine x={32} stroke={theme.mediumGray} strokeWidth={1} strokeDasharray="4 2" />
        <Scatter data={data} fill={theme.mediumGray}>
          {data.map((d, i) => (
            <Cell key={i} fill={getConditionColor(d.pctOfNormal)} fillOpacity={0.6} r={3} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
