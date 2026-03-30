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
  LabelList,
  CartesianGrid,
} from "recharts";
import { theme, chartTooltipStyle, chartCursorStyle } from "@/lib/theme";
import { getConditionColor } from "@/lib/colors";

interface StateData {
  state: string;
  stateName: string;
  pctOfNormal: number;
  stationCount: number;
}

interface StateRankingChartProps {
  data: StateData[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: StateData }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={chartTooltipStyle}>
      <div className="font-mono text-[11px] font-medium" style={{ color: theme.darkGray }}>
        {d.stateName}
      </div>
      <div className="font-mono text-[11px]" style={{ color: theme.gray }}>
        {Math.round(d.pctOfNormal)}% of median ({d.stationCount} stations)
      </div>
    </div>
  );
}

export default function StateRankingChart({ data }: StateRankingChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <XAxis
          type="number"
          domain={[0, (max: number) => Math.max(max, 120)]}
          tick={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray }}
          axisLine={{ stroke: theme.borderGray }}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="state"
          tick={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.gray }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <CartesianGrid stroke={theme.borderGray} strokeDasharray="0" horizontal={false} />
        <Tooltip content={<CustomTooltip />} cursor={chartCursorStyle} />
        <ReferenceLine x={100} stroke={theme.darkGray} strokeWidth={1.5} strokeDasharray="4 2" />
        <Bar dataKey="pctOfNormal" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((d) => (
            <Cell key={d.state} fill={getConditionColor(d.pctOfNormal)} />
          ))}
          <LabelList
            dataKey="pctOfNormal"
            position="right"
            formatter={(v: unknown) => `${Math.round(Number(v))}%`}
            style={{ fontSize: 10, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.gray }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
