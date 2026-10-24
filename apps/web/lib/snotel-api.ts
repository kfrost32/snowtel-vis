export const SOAP_URL = "https://wcc.sc.egov.usda.gov/awdbWebService/services";
const MAX_BATCH_SIZE = 300;

export function buildSoapEnvelope(method: string, params: string): string {
  return `<?xml version="1.0"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://www.wcc.nrcs.usda.gov/ns/awdbWebService">
<soapenv:Body><web:${method}>${params}</web:${method}></soapenv:Body>
</soapenv:Envelope>`;
}

async function soapRequestOnce(method: string, params: string, timeout: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(SOAP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: buildSoapEnvelope(method, params),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`SOAP request failed: ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function soapRequest(method: string, params: string, timeout = 30000): Promise<string> {
  try {
    return await soapRequestOnce(method, params, timeout);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return soapRequestOnce(method, params, timeout);
  }
}

function parseNumericValue(val: string): number | null {
  if (!val || val === "" || val === "-99.9" || val === "-99.0") return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function extractReturnBlocks(xml: string): string[] {
  const blocks: string[] = [];
  let idx = 0;
  while (true) {
    const start = xml.indexOf("<return>", idx);
    if (start === -1) break;
    const end = xml.indexOf("</return>", start);
    if (end === -1) break;
    blocks.push(xml.substring(start + 8, end));
    idx = end + 9;
  }
  return blocks;
}

function extractTag(block: string, tag: string): string | null {
  const start = block.indexOf(`<${tag}>`);
  if (start === -1) return null;
  const end = block.indexOf(`</${tag}>`, start);
  if (end === -1) return null;
  return block.substring(start + tag.length + 2, end);
}

function extractAllTags(block: string, tag: string): string[] {
  const results: string[] = [];
  let idx = 0;
  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;
  while (true) {
    const start = block.indexOf(openTag, idx);
    if (start === -1) break;
    const end = block.indexOf(closeTag, start);
    if (end === -1) break;
    results.push(block.substring(start + openTag.length, end));
    idx = end + closeTag.length;
  }
  return results;
}

function generateNDates(beginDate: string, count: number): string[] {
  const dates: string[] = [];
  const d = new Date(beginDate.split(" ")[0] + "T12:00:00Z");
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().split("T")[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

export function generateDates(beginDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(beginDate.split(" ")[0] + "T12:00:00Z");
  const end = new Date(endDate.split(" ")[0] + "T12:00:00Z");
  const d = new Date(start);
  while (d <= end) {
    dates.push(d.toISOString().split("T")[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

export function parseGetDataResponse(xml: string): Map<string, { dates: string[]; values: (number | null)[] }> {
  const result = new Map<string, { dates: string[]; values: (number | null)[] }>();
  const blocks = extractReturnBlocks(xml);
  for (const block of blocks) {
    const triplet = extractTag(block, "stationTriplet");
    if (!triplet) continue;
    const beginDate = extractTag(block, "beginDate");
    const endDate = extractTag(block, "endDate");
    if (!beginDate || !endDate) continue;
    const rawValues = extractAllTags(block, "values");
    const values = rawValues.map((v) => parseNumericValue(v));
    const dates = generateNDates(beginDate, values.length);
    result.set(triplet, { dates, values });
  }
  return result;
}

export interface HourlyValue {
  datetime: string;
  value: number | null;
}

export function parseHourlyDataResponse(xml: string): Map<string, HourlyValue[]> {
  const result = new Map<string, HourlyValue[]>();
  const blocks = extractReturnBlocks(xml);
  for (const block of blocks) {
    const triplet = extractTag(block, "stationTriplet");
    if (!triplet) continue;
    const valuesBlocks = extractAllTags(block, "values");
    const hourlyValues: HourlyValue[] = [];
    for (const vBlock of valuesBlocks) {
      const dt = extractTag(vBlock, "dateTime");
      const val = extractTag(vBlock, "value");
      if (dt) {
        hourlyValues.push({ datetime: dt, value: val ? parseNumericValue(val) : null });
      }
    }
    result.set(triplet, hourlyValues);
  }
  return result;
}

export function parseCentralTendencyResponse(xml: string): (number | null)[][] {
  const results: (number | null)[][] = [];
  const blocks = extractReturnBlocks(xml);
  for (const block of blocks) {
    const rawValues = extractAllTags(block, "values");
    results.push(rawValues.map((v) => parseNumericValue(v)));
  }
  return results;
}

export interface BulkFetchOptions {
  strict?: boolean;
  timeout?: number;
  batchSize?: number;
}

function tripletParams(triplets: string[]): string {
  return triplets.map((t) => `<stationTriplets>${t}</stationTriplets>`).join("");
}

export async function fetchElementData(
  triplets: string[],
  elementCd: string,
  beginDate: string,
  endDate: string,
  { strict = false, timeout, batchSize = MAX_BATCH_SIZE }: BulkFetchOptions = {}
): Promise<Map<string, { dates: string[]; values: (number | null)[] }>> {
  const merged = new Map<string, { dates: string[]; values: (number | null)[] }>();
  const batches: string[][] = [];
  for (let i = 0; i < triplets.length; i += batchSize) {
    batches.push(triplets.slice(i, i + batchSize));
  }
  const results = await Promise.all(
    batches.map((batch) =>
      soapRequest("getData", `${tripletParams(batch)}<elementCd>${elementCd}</elementCd><ordinal>1</ordinal><duration>DAILY</duration><getFlags>false</getFlags><beginDate>${beginDate}</beginDate><endDate>${endDate}</endDate><alwaysReturnDailyFeb29>false</alwaysReturnDailyFeb29>`, timeout)
        .then(parseGetDataResponse)
        .catch((e) => {
          if (strict) throw e;
          return new Map<string, { dates: string[]; values: (number | null)[] }>();
        })
    )
  );
  for (const map of results) {
    for (const [k, v] of map) merged.set(k, v);
  }
  return merged;
}

export async function fetchHourlyData(
  triplets: string[],
  elementCd: string,
  beginDate: string,
  endDate: string
): Promise<Map<string, HourlyValue[]>> {
  const merged = new Map<string, HourlyValue[]>();
  const batches: string[][] = [];
  for (let i = 0; i < triplets.length; i += MAX_BATCH_SIZE) {
    batches.push(triplets.slice(i, i + MAX_BATCH_SIZE));
  }
  const results = await Promise.all(
    batches.map((batch) =>
      soapRequest("getHourlyData", `${tripletParams(batch)}<elementCd>${elementCd}</elementCd><ordinal>1</ordinal><beginDate>${beginDate}</beginDate><endDate>${endDate}</endDate>`)
        .then(parseHourlyDataResponse)
        .catch(() => new Map<string, HourlyValue[]>())
    )
  );
  for (const map of results) {
    for (const [k, v] of map) merged.set(k, v);
  }
  return merged;
}

export async function fetchMedianData(
  triplets: string[],
  elementCd: string,
  beginMonth: number,
  beginDay: number,
  endMonth: number,
  endDay: number,
  { strict = false, timeout }: BulkFetchOptions = {}
): Promise<Map<string, (number | null)[]>> {
  const result = new Map<string, (number | null)[]>();
  const batches: string[][] = [];
  for (let i = 0; i < triplets.length; i += MAX_BATCH_SIZE) {
    batches.push(triplets.slice(i, i + MAX_BATCH_SIZE));
  }
  const batchResults = await Promise.all(
    batches.map((batch) =>
      soapRequest("getCentralTendencyData", `${tripletParams(batch)}<elementCd>${elementCd}</elementCd><duration>DAILY</duration><getFlags>false</getFlags><centralTendencyType>MEDIAN</centralTendencyType><beginMonth>${beginMonth}</beginMonth><beginDay>${beginDay}</beginDay><endMonth>${endMonth}</endMonth><endDay>${endDay}</endDay>`, timeout)
        .then((xml) => ({ triplets: batch, data: parseCentralTendencyResponse(xml) }))
        .catch((e) => {
          if (strict) throw e;
          return { triplets: batch, data: [] as (number | null)[][] };
        })
    )
  );
  for (const { triplets: batchTriplets, data } of batchResults) {
    for (let i = 0; i < batchTriplets.length; i++) {
      result.set(batchTriplets[i], data[i] || []);
    }
  }
  return result;
}

export { parseNumericValue };
