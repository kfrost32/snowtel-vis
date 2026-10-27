import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildSeries, calendarRow, DAYS, median, round, writeYears, yearlyPeaks } from "./lib/envelope-stats.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "apps", "web", "public", "envelopes");
const MEDIANS_FILE = path.join(ROOT, "apps", "web", "lib", "bc-medians.json");
const CACHE_DIR = path.join(ROOT, "node_modules", ".cache", "snotel-bc");
const DATA_URL = "https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data";

const MIN_MEDIAN_YEARS = 10;
const SWE_HOURS = ["16:00", "00:00"];
const DEPTH_HOUR = "08:00";
const MM_PER_INCH = 25.4;
const CM_PER_INCH = 2.54;

const now = new Date();
const lastCompleteWaterYear = (now.getUTCMonth() >= 9 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()) - 1;
const generated = now.toISOString().split("T")[0];
const stations = JSON.parse(fs.readFileSync(path.join(ROOT, "packages", "core", "data", "bc-stations.json"), "utf8"));

async function download(name) {
  const file = path.join(CACHE_DIR, name);
  if (!fs.existsSync(file)) {
    const res = await fetch(`${DATA_URL}/${name}`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log(`Downloaded ${name}`);
  }
  return fs.readFileSync(file, "utf8");
}

const waterYear = (date) => Number(date.slice(0, 4)) + (Number(date.slice(5, 7)) >= 10 ? 1 : 0);

function readArchive(csv, keepRow, unitsPerInch) {
  const lines = csv.split(/\r?\n/);
  const ids = lines[0].split(",").slice(1).map((column) => column.split(" ")[0]);
  const byStation = new Map(ids.map((id) => [id, new Map()]));
  const priority = new Map();
  for (const line of lines.slice(1)) {
    const comma = line.indexOf(",");
    const stamp = line.slice(0, comma);
    const rank = keepRow(stamp.slice(11, 16));
    if (rank === -1) continue;
    const date = stamp.slice(0, 10);
    const wy = waterYear(date);
    if (wy > lastCompleteWaterYear) continue;
    const row = calendarRow(date);
    line.slice(comma + 1).split(",").forEach((cell, i) => {
      if (cell === "") return;
      const value = Number(cell);
      if (!Number.isFinite(value) || value < 0) return;
      const key = `${ids[i]}:${date}`;
      if ((priority.get(key) ?? Infinity) <= rank) return;
      priority.set(key, rank);
      const years = byStation.get(ids[i]);
      if (!years.has(wy)) years.set(wy, new Float32Array(DAYS).fill(NaN));
      years.get(wy)[row] = value / unitsPerInch;
    });
  }
  return byStation;
}

function rowMedians(years) {
  return Array.from({ length: DAYS }, (_, d) => {
    const values = [...years.values()].map((arr) => arr[d]).filter((v) => !Number.isNaN(v));
    return values.length >= MIN_MEDIAN_YEARS ? median(values) : null;
  });
}

const swe = readArchive(await download("SW_DailyArchive.csv"), (hour) => SWE_HOURS.indexOf(hour), MM_PER_INCH);
const depth = readArchive(await download("SD_Archive.csv"), (hour) => (hour === DEPTH_HOUR ? 0 : -1), CM_PER_INCH);

fs.mkdirSync(path.join(OUTPUT_DIR, "stations"), { recursive: true });
fs.mkdirSync(path.join(OUTPUT_DIR, "years", "stations"), { recursive: true });

const medians = {};
let written = 0;
for (const { id } of stations) {
  const sweYears = swe.get(id) ?? new Map();
  const depthYears = depth.get(id) ?? new Map();
  if (!sweYears.size) continue;
  const sweMedians = rowMedians(sweYears);
  const file = {
    generated,
    lastWaterYear: lastCompleteWaterYear,
    peaks: yearlyPeaks(sweYears),
    swe: buildSeries((d) => [...sweYears].map(([wy, arr]) => [wy, arr[d]]), sweMedians, -Infinity, sweYears.values()),
    depth: buildSeries((d) => [...depthYears].map(([wy, arr]) => [wy, arr[d]]), rowMedians(depthYears), -Infinity, depthYears.values()),
  };
  const fileId = `${id}-BC-ASWS`;
  fs.writeFileSync(path.join(OUTPUT_DIR, "stations", `${fileId}.json`), JSON.stringify(file));
  writeYears(OUTPUT_DIR, generated, "stations", fileId, sweYears, -Infinity);
  if (sweMedians.some((v) => v !== null)) medians[id] = sweMedians.map(round);
  written++;
}

fs.writeFileSync(MEDIANS_FILE, JSON.stringify({ generated, stations: medians }));
console.log(`Wrote ${written}/${stations.length} BC station envelopes, ${Object.keys(medians).length} with medians (WY through ${lastCompleteWaterYear})`);
