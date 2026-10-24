"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
  Label,
} from "recharts";
import { theme, chartColors, snowColors, chartTooltipStyle } from "@snotel/core/theme";
import { getConditionColor } from "@snotel/core/colors";

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
        {Math.round(d.temp)}°F / {Math.round(d.pctOfNormal)}% of median
      </div>
    </div>
  );
}

const FREEZING_F = 32;

const MONO_LABEL_STYLE = {
  fontSize: 10,
  fontFamily: "var(--font-ibm-plex-mono)",
};

const QUADRANT_LABEL_STYLE = {
  ...MONO_LABEL_STYLE,
  fontWeight: 600,
  letterSpacing: "0.05em",
};

const AXIS_TICK_STYLE = { fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)", fill: theme.mediumGray };

const REFERENCE_LINE_PROPS = { stroke: theme.darkGray, strokeWidth: 1.5, strokeDasharray: "6 3" };

const QUADRANTS = [
  { label: "COLD + HIGH SNOWPACK", cold: true, high: true, fill: chartColors.blue, text: chartColors.blue },
  { label: "WARM + HIGH SNOWPACK", cold: false, high: true, fill: chartColors.orange, text: chartColors.orangeDark },
  { label: "COLD + LOW SNOWPACK", cold: true, high: false, fill: chartColors.purple, text: chartColors.purpleDark },
  { label: "WARM + LOW SNOWPACK", cold: false, high: false, fill: snowColors.wellBelow, text: snowColors.wellBelow },
] as const;

export default function TempScatter({ data }: TempScatterProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 16, right: 16, bottom: 4, left: -4 }}>
        {QUADRANTS.map((q) => (
          <ReferenceArea
            key={q.label}
            x1={q.cold ? undefined : FREEZING_F}
            x2={q.cold ? FREEZING_F : undefined}
            y1={q.high ? 100 : 0}
            y2={q.high ? undefined : 100}
            fill={q.fill}
            fillOpacity={0.04}
          >
            <Label
              value={q.label}
              position={`inside${q.high ? "Top" : "Bottom"}${q.cold ? "Left" : "Right"}`}
              offset={8}
              fill={q.text}
              {...QUADRANT_LABEL_STYLE}
            />
          </ReferenceArea>
        ))}

        <XAxis
          type="number"
          dataKey="temp"
          name="Temperature"
          domain={[(min: number) => Math.min(min, 0), (max: number) => Math.max(max, 60)]}
          tick={AXIS_TICK_STYLE}
          axisLine={{ stroke: theme.borderGray }}
          tickLine={false}
          tickFormatter={(v: number) => `${v}°F`}
        />
        <YAxis
          type="number"
          dataKey="pctOfNormal"
          name="% of Median"
          domain={[0, (max: number) => Math.min(Math.max(max, 200), 300)]}
          tick={AXIS_TICK_STYLE}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={100} {...REFERENCE_LINE_PROPS}>
          <Label value="100% of median" position="insideTopRight" offset={6} fill={theme.gray} {...MONO_LABEL_STYLE} />
        </ReferenceLine>
        <ReferenceLine x={FREEZING_F} {...REFERENCE_LINE_PROPS}>
          <Label value="Freezing" position="insideTopLeft" offset={6} fill={theme.gray} {...MONO_LABEL_STYLE} />
        </ReferenceLine>
        <Scatter data={data} fill={theme.mediumGray}>
          {data.map((d, i) => (
            <Cell key={i} fill={getConditionColor(d.pctOfNormal)} fillOpacity={0.55} r={3.5} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
