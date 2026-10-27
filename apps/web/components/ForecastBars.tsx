"use client";

import { ArrowUpRight, Cloud, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from "lucide-react";
import type { Station } from "@snotel/core/types";
import { snowColors, theme } from "@/lib/theme";
import {
  forecastDayLabel,
  forecastSky,
  forecastTotal,
  formatSnowfall,
  formatTempRange,
  forecastSourceLine,
  nwsForecastUrl,
  type ForecastSky,
  type StationForecast,
} from "@snotel/core/forecast";

const BAR_HEIGHT = 32;
const MIN_SCALE = 1;
const BAR_COLOR = snowColors.snowDepth;

const SKY_ICONS: Record<ForecastSky, { icon: LucideIcon; color: string }> = {
  clear: { icon: Sun, color: "#F59E0B" },
  partly: { icon: CloudSun, color: theme.mediumGray },
  cloudy: { icon: Cloud, color: theme.mediumGray },
  snow: { icon: CloudSnow, color: BAR_COLOR },
  rain: { icon: CloudRain, color: "#3B82F6" },
};

export default function ForecastBars({ forecast, station }: { forecast: StationForecast; station: Station }) {
  const total = forecastTotal(forecast);
  const scale = Math.max(MIN_SCALE, ...forecast.days.map((d) => d.snow));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="font-sans text-2xl font-semibold tabular-nums" style={{ color: theme.black }}>
          {total > 0 ? `+${formatSnowfall(total)}` : "No snow"}
        </span>
        <span className="font-mono text-xs" style={{ color: theme.mediumGray }}>
          next {forecast.days.length} days
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {forecast.days.map((day, i) => {
          const { icon: Icon, color } = SKY_ICONS[forecastSky(day)];
          const temps = formatTempRange(day);
          return (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1 rounded-xl py-2.5"
              style={{ background: theme.lightGray, boxShadow: i === 0 ? `inset 0 0 0 1.5px ${theme.borderGray}` : undefined }}
            >
              <span className="font-mono text-xs" style={{ color: i === 0 ? theme.black : theme.gray, fontWeight: i === 0 ? 600 : 400 }}>
                {forecastDayLabel(day.date, i)}
              </span>
              <Icon size={18} strokeWidth={1.75} style={{ color }} />
              <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: day.snow > 0 ? theme.black : theme.borderGray }}>
                {day.snow > 0 ? formatSnowfall(day.snow) : "–"}
              </span>
              <div className="w-3/5 max-w-[22px] flex items-end" style={{ height: BAR_HEIGHT }}>
                <div className="w-full rounded" style={{ height: Math.max(day.snow > 0 ? 3 : 0, (day.snow / scale) * BAR_HEIGHT), background: BAR_COLOR }} />
              </div>
              <span className="font-mono text-xs tabular-nums" style={{ color: theme.black }}>{temps.high}</span>
              <span className="font-mono text-xs tabular-nums -mt-1" style={{ color: theme.mediumGray }}>{temps.low}</span>
              <span className="font-mono text-xs tabular-nums" style={{ color: theme.mediumGray }}>
                {day.precipChance != null ? `${day.precipChance}%` : ""}
              </span>
            </div>
          );
        })}
      </div>

      <a
        href={nwsForecastUrl(station.latitude, station.longitude)}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start inline-flex items-center gap-0.5 font-mono text-xs underline-offset-2 hover:underline"
        style={{ color: theme.mediumGray }}
      >
        {forecastSourceLine(forecast)} <ArrowUpRight size={12} />
      </a>
    </div>
  );
}
