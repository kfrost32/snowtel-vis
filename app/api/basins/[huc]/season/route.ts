import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getAllStations } from "@/lib/stations";
import { fetchElementData } from "@/lib/snotel-api";
import { getStationHucs } from "@/lib/basins";
import { todayInDataTimezone } from "@/lib/station-conditions";
import { getCurrentWaterYear, getWaterYearStart, getWaterYearDay } from "@/lib/water-year";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CACHE_HEADER = { "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=1800" };
const NO_CACHE_HEADER = { "Cache-Control": "private, no-cache, no-store" };

const getBasinSeason = unstable_cache(
  async (huc: string) => {
    const triplets = getAllStations()
      .filter((s) => s.network === "SNOTEL" && getStationHucs(s).some((h) => h.startsWith(huc)))
      .map((s) => s.triplet);
    const data = await fetchElementData(triplets, "WTEQ", getWaterYearStart(getCurrentWaterYear()), todayInDataTimezone(), {
      strict: true,
      timeout: 90000,
      batchSize: 100,
    });

    const sums = new Map<number, { sum: number; n: number }>();
    for (const { dates, values } of data.values()) {
      dates.forEach((date, i) => {
        const v = values[i];
        if (v === null) return;
        const wyDay = getWaterYearDay(date);
        const acc = sums.get(wyDay) ?? { sum: 0, n: 0 };
        acc.sum += v;
        acc.n++;
        sums.set(wyDay, acc);
      });
    }
    const season = [...sums]
      .sort(([a], [b]) => a - b)
      .map(([wyDay, { sum, n }]) => ({ wyDay, swe: Math.round((sum / n) * 10) / 10 }));
    return { data: season, fetchedAt: Date.now() };
  },
  ["basin-season"],
  { revalidate: 3600 }
);

export async function GET(_request: Request, { params }: { params: Promise<{ huc: string }> }) {
  const { huc } = await params;
  if (!/^\d{2}(\d{2})?$/.test(huc)) {
    return NextResponse.json({ error: "Invalid basin" }, { status: 404, headers: NO_CACHE_HEADER });
  }
  try {
    const season = await getBasinSeason(huc);
    return NextResponse.json({ ...season, stale: false }, { headers: CACHE_HEADER });
  } catch (e) {
    console.error(`Basin ${huc} season fetch failed:`, (e as Error).message);
    return NextResponse.json({ error: "Failed to fetch basin season" }, { status: 502, headers: NO_CACHE_HEADER });
  }
}
