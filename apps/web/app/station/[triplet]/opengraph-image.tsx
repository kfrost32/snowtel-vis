import { ImageResponse } from "next/og";
import { parseTripletFromUrl } from "@snotel/core/stations";
import { theme } from "@snotel/core/theme";
import { getConditionColor, getDepthChangeColor } from "@snotel/core/colors";
import { formatDepthChange, formatHourlyTime, formatPctOfNormal, formatReadingEndOfDay, formatSnowDepth, formatSwe } from "@snotel/core/formatting";
import { SNOW_QUALITY } from "@snotel/core/storm";
import { stationPlace, stationShare } from "@/lib/station-share";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Current snowpack at this SNOTEL station";
export const revalidate = 3600;

function Stat({ label, value, color = theme.black }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 26, color: theme.gray }}>{label}</div>
      <div style={{ fontSize: 44, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ triplet: string }> }) {
  const share = await stationShare(parseTripletFromUrl((await params).triplet));
  const station = share?.station;
  const conditions = share?.conditions ?? null;
  const storm = share?.storm ?? null;
  const change = conditions?.depthChange1d ?? null;
  const asOf = conditions?.depthAt
    ? `As of ${formatHourlyTime(conditions.depthAt)}`
    : conditions?.lastUpdated
      ? formatReadingEndOfDay(conditions.lastUpdated)
      : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: theme.offWhite }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 24, letterSpacing: 4, color: theme.mediumGray }}>SNOTEL EXPLORER</div>
          <div style={{ fontSize: 76, fontWeight: 700, color: theme.black, lineHeight: 1.05 }}>{station?.name ?? "SNOTEL station"}</div>
          {station && <div style={{ fontSize: 34, color: theme.gray }}>{stationPlace(station)}</div>}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 180, fontWeight: 700, color: theme.black, lineHeight: 1 }}>{formatSnowDepth(conditions?.snowDepth ?? null)}</div>
            <div style={{ fontSize: 30, color: theme.gray }}>{asOf ? `snow depth · ${asOf}` : "snow depth"}</div>
          </div>
          <div style={{ display: "flex", gap: 56, paddingBottom: 8 }}>
            <Stat label="24h" value={formatDepthChange(change)} color={change ? getDepthChangeColor(change) : theme.black} />
            <Stat label="SWE" value={formatSwe(conditions?.swe ?? null)} />
            <Stat
              label="Median"
              value={formatPctOfNormal(conditions?.pctOfNormal ?? null)}
              color={conditions?.pctOfNormal != null ? getConditionColor(conditions.pctOfNormal) : theme.black}
            />
            {storm && (
              <Stat
                label="Storm total"
                value={`+${formatSnowDepth(storm.newSnow)}`}
                color={storm.quality ? SNOW_QUALITY[storm.quality].color : theme.black}
              />
            )}
          </div>
        </div>
      </div>
    ),
    size
  );
}
