import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { calendarRow, DAYS, lastCompleteWaterYear, waterYear, writeNetworkHistories } from "./lib/envelope-stats.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MEDIANS_FILE = path.join(ROOT, "apps", "web", "lib", "cdec-medians.json");
const CACHE_DIR = path.join(ROOT, "node_modules", ".cache", "snotel-cdec");
const DATA_URL = "https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet";

const SWE_SENSOR = "3";
const DEPTH_SENSOR = "18";
const HISTORY_START = "1960-10-01";
const MAX_PLAUSIBLE = { [SWE_SENSOR]: 150, [DEPTH_SENSOR]: 400 };
const MAX_DAILY_RISE = { [SWE_SENSOR]: 15, [DEPTH_SENSOR]: 48 };
const BASELINE_DAYS = 7;
const DAY_MS = 86400000;
const CONCURRENCY = 6;

const historyEnd = `${lastCompleteWaterYear}-09-30`;
const stations = JSON.parse(fs.readFileSync(path.join(ROOT, "packages", "core", "data", "cdec-stations.json"), "utf8"));

async function download(id) {
  const file = path.join(CACHE_DIR, `${id}-${lastCompleteWaterYear}.csv`);
  if (!fs.existsSync(file)) {
    const params = new URLSearchParams({ Stations: id, SensorNums: `${SWE_SENSOR},${DEPTH_SENSOR}`, dur_code: "D", Start: HISTORY_START, End: historyEnd });
    const res = await fetch(`${DATA_URL}?${params}`);
    if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
    const csv = await res.text();
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, csv);
    return csv;
  }
  return fs.readFileSync(file, "utf8");
}

function plausibleReadings(maxDailyRise) {
  const recent = [];
  return (day, value) => {
    while (recent.length && day - recent[0].day > BASELINE_DAYS) recent.shift();
    const last = recent.at(-1);
    if (last) {
      const baseline = Math.max(...recent.map((r) => r.value));
      if (value > baseline + maxDailyRise * (day - last.day)) return false;
    }
    recent.push({ day, value });
    return true;
  };
}

function readHistory(csv) {
  const bySensor = { [SWE_SENSOR]: new Map(), [DEPTH_SENSOR]: new Map() };
  const plausible = { [SWE_SENSOR]: plausibleReadings(MAX_DAILY_RISE[SWE_SENSOR]), [DEPTH_SENSOR]: plausibleReadings(MAX_DAILY_RISE[DEPTH_SENSOR]) };
  for (const line of csv.split(/\r?\n/).slice(1)) {
    const cells = line.split(",");
    const years = bySensor[cells[2]];
    if (!years || cells[6] === "---") continue;
    const value = Number(cells[6]);
    if (!Number.isFinite(value) || value > MAX_PLAUSIBLE[cells[2]]) continue;
    const at = cells[4];
    const date = `${at.slice(0, 4)}-${at.slice(4, 6)}-${at.slice(6, 8)}`;
    if (!plausible[cells[2]](Date.parse(date) / DAY_MS, Math.max(value, 0)) || value < 0) continue;
    const wy = waterYear(date);
    if (!years.has(wy)) years.set(wy, new Float32Array(DAYS).fill(NaN));
    years.get(wy)[calendarRow(date)] = value;
  }
  return bySensor;
}

const histories = new Map();
for (let i = 0; i < stations.length; i += CONCURRENCY) {
  const batch = stations.slice(i, i + CONCURRENCY);
  const csvs = await Promise.all(batch.map(({ id }) => download(id)));
  batch.forEach(({ id }, j) => histories.set(id, readHistory(csvs[j])));
  console.log(`Downloaded ${Math.min(i + CONCURRENCY, stations.length)}/${stations.length}`);
}

writeNetworkHistories({
  label: "CDEC",
  stations,
  triplet: (id) => `${id}:CA:CDEC`,
  history: (id) => ({ swe: histories.get(id)[SWE_SENSOR], depth: histories.get(id)[DEPTH_SENSOR] }),
  mediansFile: MEDIANS_FILE,
});
