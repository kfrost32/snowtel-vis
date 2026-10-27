import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildSeries, calendarRow, DAYS, lastCompleteWaterYear, writeYears, yearlyPeaks } from "./lib/envelope-stats.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "apps", "web", "public", "envelopes");
const CACHE_DIR = path.join(ROOT, "node_modules", ".cache", "snotel-envelopes");
const SOAP_URL = "https://wcc.sc.egov.usda.gov/awdbWebService/services";

const FIRST_WATER_YEAR = 1964;
const BATCH_SIZE = 100;
const CONCURRENCY = 6;
const TIMEOUT_MS = 120000;
const MAX_ATTEMPTS = 4;
const MIN_BASIN_AVG = 0.05;
const ELEMENTS = { swe: "WTEQ", depth: "SNWD" };
const QUARTERS = [[10, 12, 31], [1, 3, 31], [4, 6, 30], [7, 9, 30]];

const now = new Date();

const geo = JSON.parse(fs.readFileSync(path.join(ROOT, "packages", "core", "data", "stations.json"), "utf8"));
const associations = JSON.parse(fs.readFileSync(path.join(ROOT, "packages", "core", "data", "huc-associations.json"), "utf8"));
const stations = geo.features
  .map((f) => f.properties)
  .filter((p) => p.network === "SNOTEL")
  .map((p) => {
    const triplet = p.code.replace(/_/g, ":");
    return { triplet, hucs: [p.HUC ?? "", ...(associations[triplet] ?? [])] };
  });
const triplets = stations.map((s) => s.triplet);
const batches = [];
for (let i = 0; i < triplets.length; i += BATCH_SIZE) batches.push(triplets.slice(i, i + BATCH_SIZE));

function soapBody(method, params) {
  return `<?xml version="1.0"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://www.wcc.nrcs.usda.gov/ns/awdbWebService"><soapenv:Body><web:${method}>${params}</web:${method}></soapenv:Body></soapenv:Envelope>`;
}

function between(text, open, close, from = 0) {
  const start = text.indexOf(open, from);
  if (start === -1) return null;
  const end = text.indexOf(close, start);
  if (end === -1) return null;
  return { value: text.slice(start + open.length, end), next: end + close.length };
}

function allBetween(text, open, close) {
  const out = [];
  let idx = 0;
  for (let m = between(text, open, close, idx); m; m = between(text, open, close, idx)) {
    out.push(m.value);
    idx = m.next;
  }
  return out;
}

function parseValue(v) {
  if (!v || v === "-99.9" || v === "-99.0") return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

async function soap(method, params) {
  for (let attempt = 1; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(SOAP_URL, { method: "POST", headers: { "Content-Type": "text/xml" }, body: soapBody(method, params), signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (attempt >= MAX_ATTEMPTS) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
}

async function cached(key, fetcher) {
  const file = path.join(CACHE_DIR, `${key}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const data = await fetcher();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
  return data;
}

const tripletParams = (batch) => batch.map((t) => `<stationTriplets>${t}</stationTriplets>`).join("");

function fetchWaterYear(elementCd, wy, batch, batchIndex) {
  return cached(`${elementCd}-${wy}-${batchIndex}`, async () => {
    const xml = await soap("getData", `${tripletParams(batch)}<elementCd>${elementCd}</elementCd><ordinal>1</ordinal><duration>DAILY</duration><getFlags>false</getFlags><beginDate>${wy - 1}-10-01</beginDate><endDate>${wy}-09-30</endDate><alwaysReturnDailyFeb29>false</alwaysReturnDailyFeb29>`);
    const out = {};
    for (const block of allBetween(xml, "<return>", "</return>")) {
      const triplet = between(block, "<stationTriplet>", "</stationTriplet>")?.value;
      const beginDate = between(block, "<beginDate>", "</beginDate>")?.value;
      if (!triplet || !beginDate) continue;
      out[triplet] = { beginDate: beginDate.split(" ")[0], values: allBetween(block, "<values>", "</values>").map(parseValue) };
    }
    return out;
  });
}

function fetchMedianQuarter(elementCd, [beginMonth, endMonth, endDay], batch, batchIndex) {
  return cached(`median-${elementCd}-${beginMonth}-${batchIndex}`, async () => {
    const xml = await soap("getCentralTendencyData", `${tripletParams(batch)}<elementCd>${elementCd}</elementCd><duration>DAILY</duration><getFlags>false</getFlags><centralTendencyType>MEDIAN</centralTendencyType><beginMonth>${beginMonth}</beginMonth><beginDay>1</beginDay><endMonth>${endMonth}</endMonth><endDay>${endDay}</endDay>`);
    const blocks = allBetween(xml, "<return>", "</return>");
    return Object.fromEntries(batch.map((t, i) => [t, blocks[i] ? allBetween(blocks[i], "<values>", "</values>").map(parseValue) : []]));
  });
}

async function runAll(jobs, label) {
  let done = 0;
  let cursor = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      await job();
      done++;
      if (done % 25 === 0 || done === jobs.length) console.log(`${label}: ${done}/${jobs.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

const series = {};
const medians = {};

for (const [key, elementCd] of Object.entries(ELEMENTS)) {
  series[key] = new Map(triplets.map((t) => [t, new Map()]));
  medians[key] = new Map(triplets.map((t) => [t, []]));

  const jobs = [];
  for (let wy = FIRST_WATER_YEAR; wy <= lastCompleteWaterYear; wy++) {
    batches.forEach((batch, batchIndex) => {
      jobs.push(async () => {
        const data = await fetchWaterYear(elementCd, wy, batch, batchIndex);
        for (const [triplet, { beginDate, values }] of Object.entries(data)) {
          if (!values.some((v) => v !== null)) continue;
          const arr = new Float32Array(DAYS).fill(NaN);
          const startMs = Date.parse(`${beginDate}T00:00:00Z`);
          values.forEach((v, i) => {
            const idx = calendarRow(new Date(startMs + i * DAY_MS).toISOString());
            if (v !== null && idx >= 0 && idx < DAYS) arr[idx] = v;
          });
          series[key].get(triplet)?.set(wy, arr);
        }
      });
    });
  }
  await runAll(jobs, `${elementCd} history`);

  const quarterResults = [];
  const medianJobs = [];
  QUARTERS.forEach((quarter, qi) => {
    quarterResults[qi] = {};
    batches.forEach((batch, batchIndex) => {
      medianJobs.push(async () => Object.assign(quarterResults[qi], await fetchMedianQuarter(elementCd, quarter, batch, batchIndex)));
    });
  });
  await runAll(medianJobs, `${elementCd} medians`);
  for (const t of triplets) medians[key].set(t, quarterResults.flatMap((q) => q[t] ?? []));
}

const generated = now.toISOString().split("T")[0];
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(OUTPUT_DIR, "stations"), { recursive: true });
fs.mkdirSync(path.join(OUTPUT_DIR, "basins"), { recursive: true });
fs.mkdirSync(path.join(OUTPUT_DIR, "years", "stations"), { recursive: true });
fs.mkdirSync(path.join(OUTPUT_DIR, "years", "basins"), { recursive: true });

for (const t of triplets) {
  const station = { generated, lastWaterYear: lastCompleteWaterYear, peaks: yearlyPeaks(series.swe.get(t)) };
  for (const key of Object.keys(ELEMENTS)) {
    const years = series[key].get(t);
    station[key] = buildSeries((d) => [...years].map(([wy, arr]) => [wy, arr[d]]), medians[key].get(t), -Infinity, years.values());
  }
  const id = t.replace(/:/g, "-");
  fs.writeFileSync(path.join(OUTPUT_DIR, "stations", `${id}.json`), JSON.stringify(station));
  writeYears(OUTPUT_DIR, generated, "stations", id, series.swe.get(t), -Infinity);
}

const basinMembers = new Map();
for (const s of stations) {
  for (const level of [2, 4]) {
    for (const prefix of new Set(s.hucs.filter((h) => h.length >= level).map((h) => h.slice(0, level)))) {
      if (!basinMembers.has(prefix)) basinMembers.set(prefix, []);
      basinMembers.get(prefix).push(s.triplet);
    }
  }
}

for (const [huc, members] of basinMembers) {
  const yearlyAverages = Array.from({ length: DAYS }, () => new Map());
  for (let d = 0; d < DAYS; d++) {
    const sums = new Map();
    for (const t of members) {
      for (const [wy, arr] of series.swe.get(t)) {
        const v = arr[d];
        if (Number.isNaN(v)) continue;
        const acc = sums.get(wy) ?? { sum: 0, n: 0 };
        acc.sum += v;
        acc.n++;
        sums.set(wy, acc);
      }
    }
    for (const [wy, { sum, n }] of sums) yearlyAverages[d].set(wy, sum / n);
  }
  const medianAverage = [];
  for (let d = 0; d < DAYS; d++) {
    const vals = members.map((t) => medians.swe.get(t)[d]).filter((v) => v !== null && v !== undefined);
    medianAverage.push(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
  }
  const wys = [...new Set(yearlyAverages.flatMap((m) => [...m.keys()]))].sort((a, b) => a - b);
  const basinYears = wys.map((wy) => [wy, yearlyAverages.map((m) => {
    const v = m.get(wy);
    return v === undefined || v < MIN_BASIN_AVG ? NaN : v;
  })]);
  const basin = {
    generated,
    lastWaterYear: lastCompleteWaterYear,
    stationCount: members.length,
    swe: buildSeries((d) => yearlyAverages[d], medianAverage, MIN_BASIN_AVG, basinYears.map(([, values]) => values)),
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, "basins", `${huc}.json`), JSON.stringify(basin));
  writeYears(OUTPUT_DIR, generated, "basins", huc, basinYears, MIN_BASIN_AVG);
}

console.log(`Wrote ${triplets.length} station and ${basinMembers.size} basin envelopes (WY ${FIRST_WATER_YEAR}–${lastCompleteWaterYear})`);
