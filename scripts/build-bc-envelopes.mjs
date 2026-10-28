import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { calendarRow, DAYS, lastCompleteWaterYear, waterYear, writeNetworkHistories } from "./lib/envelope-stats.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MEDIANS_FILE = path.join(ROOT, "apps", "web", "lib", "bc-medians.json");
const CACHE_DIR = path.join(ROOT, "node_modules", ".cache", "snotel-bc");
const DATA_URL = "https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data";

const SWE_HOURS = ["16:00", "00:00"];
const DEPTH_HOURS = ["08:00"];
const MM_PER_INCH = 25.4;
const CM_PER_INCH = 2.54;

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

function readArchive(csv, hours, unitsPerInch) {
  const lines = csv.split(/\r?\n/);
  const ids = lines[0].split(",").slice(1).map((column) => column.split(" ")[0]);
  const byStation = new Map(ids.map((id) => [id, new Map()]));
  const ranks = new Map(ids.map((id) => [id, new Map()]));
  for (let l = 1; l < lines.length; l++) {
    const line = lines[l];
    const comma = line.indexOf(",");
    const rank = hours.indexOf(line.slice(11, 16));
    if (rank === -1) continue;
    const date = line.slice(0, 10);
    const wy = waterYear(date);
    if (wy > lastCompleteWaterYear) continue;
    const row = calendarRow(date);
    line.slice(comma + 1).split(",").forEach((cell, i) => {
      if (cell === "") return;
      const value = Number(cell);
      if (!Number.isFinite(value) || value < 0) return;
      const years = byStation.get(ids[i]);
      const yearRanks = ranks.get(ids[i]);
      if (!years.has(wy)) {
        years.set(wy, new Float32Array(DAYS).fill(NaN));
        yearRanks.set(wy, new Int8Array(DAYS).fill(hours.length));
      }
      if (yearRanks.get(wy)[row] <= rank) return;
      yearRanks.get(wy)[row] = rank;
      years.get(wy)[row] = value / unitsPerInch;
    });
  }
  return byStation;
}

const [sweCsv, depthCsv] = await Promise.all([download("SW_DailyArchive.csv"), download("SD_Archive.csv")]);
const swe = readArchive(sweCsv, SWE_HOURS, MM_PER_INCH);
const depth = readArchive(depthCsv, DEPTH_HOURS, CM_PER_INCH);

writeNetworkHistories({
  label: "BC",
  stations,
  triplet: (id) => `${id}:BC:ASWS`,
  history: (id) => ({ swe: swe.get(id) ?? new Map(), depth: depth.get(id) ?? new Map() }),
  mediansFile: MEDIANS_FILE,
});
