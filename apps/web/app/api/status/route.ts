import { NextResponse } from "next/server";
import { REST_URL } from "@/lib/snotel-api";

const CSV_URL = "https://wcc.sc.egov.usda.gov/reportGenerator/view_csv/customSingleStationReport/daily/669:CO:SNTL%7Cid=%22%22%7Cname/0,0/WTEQ::value";
const CACHE_HEADER = { "Cache-Control": "public, max-age=15, s-maxage=15" };

async function checkEndpoint(url: string): Promise<{ ok: boolean; latency: number; status?: number; error?: string }> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    return { ok: res.ok, latency: Date.now() - start, status: res.status };
  } catch (e) {
    return { ok: false, latency: Date.now() - start, error: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

function healthCheckUrl(): string {
  const today = new Date().toISOString().split("T")[0];
  return `${REST_URL}/data?stationTriplets=669:CO:SNTL&elements=WTEQ&duration=DAILY&beginDate=${today}&endDate=${today}`;
}

export async function GET() {
  const [rest, csv] = await Promise.all([
    checkEndpoint(healthCheckUrl()),
    checkEndpoint(CSV_URL),
  ]);

  const result = {
    timestamp: Date.now(),
    services: {
      rest: { name: "NRCS AWDB API", ...rest },
      csv: { name: "NRCS Report Generator", ...csv },
    },
    overall: rest.ok && csv.ok ? "operational" : rest.ok || csv.ok ? "degraded" : "down",
  };

  return NextResponse.json(result, { headers: CACHE_HEADER });
}
