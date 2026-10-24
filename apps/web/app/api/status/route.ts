import { NextResponse } from "next/server";
import { SOAP_URL, buildSoapEnvelope } from "@/lib/snotel-api";

const CSV_URL = "https://wcc.sc.egov.usda.gov/reportGenerator/view_csv/customSingleStationReport/daily/669:CO:SNTL%7Cid=%22%22%7Cname/0,0/WTEQ::value";
const CACHE_HEADER = { "Cache-Control": "public, max-age=15, s-maxage=15" };

async function checkEndpoint(url: string, method: string, body?: string): Promise<{ ok: boolean; latency: number; status?: number; error?: string }> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "text/xml" } : {},
      body,
      signal: controller.signal,
      cache: "no-store",
    });
    const latency = Date.now() - start;
    const ok = res.ok || (method === "POST" && res.status < 500);
    return { ok, latency, status: res.status };
  } catch (e) {
    return { ok: false, latency: Date.now() - start, error: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

function buildHealthCheckBody(): string {
  const today = new Date().toISOString().split("T")[0];
  return buildSoapEnvelope(
    "getData",
    `<stationTriplets>669:CO:SNTL</stationTriplets><elementCd>WTEQ</elementCd><ordinal>1</ordinal><duration>DAILY</duration><getFlags>false</getFlags><beginDate>${today}</beginDate><endDate>${today}</endDate><alwaysReturnDailyFeb29>false</alwaysReturnDailyFeb29>`
  );
}

export async function GET() {
  const [soap, csv] = await Promise.all([
    checkEndpoint(SOAP_URL, "POST", buildHealthCheckBody()),
    checkEndpoint(CSV_URL, "GET"),
  ]);

  const result = {
    timestamp: Date.now(),
    services: {
      soap: { name: "NRCS SOAP API", ...soap },
      csv: { name: "NRCS Report Generator", ...csv },
    },
    overall: soap.ok && csv.ok ? "operational" : soap.ok || csv.ok ? "degraded" : "down",
  };

  return NextResponse.json(result, { headers: CACHE_HEADER });
}
