import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mapshaper from "mapshaper";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCE_URL = "https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_state_20m.zip";
const PROVINCES_URL = "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_50m_admin_1_states_provinces.geojson";
const CACHE_DIR = path.join(ROOT, "node_modules", ".cache", "snotel-states");
const CACHE = path.join(CACHE_DIR, "cb_2023_us_state_20m.zip");
const PROVINCES_CACHE = path.join(CACHE_DIR, "ne_50m_admin_1_states_provinces.geojson");
const PROVINCES_OUTPUT = path.join(CACHE_DIR, "provinces.json");
const PROVINCES = ["BC"];
const OUTPUT = path.join(ROOT, "packages", "core", "data", "state-boundaries.json");

const stations = JSON.parse(fs.readFileSync(path.join(ROOT, "packages", "core", "data", "stations.json"), "utf8"));
const snotelStates = [...new Set(stations.features.map((f) => f.properties.state))].sort();

async function download(url, file) {
  if (fs.existsSync(file)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

await download(SOURCE_URL, CACHE);
await download(PROVINCES_URL, PROVINCES_CACHE);

await mapshaper.runCommands(
  [
    `-i ${CACHE}`,
    `-filter '${JSON.stringify(snotelStates)}.includes(STUSPS)'`,
    "-clip bbox=-180,15,-60,72",
    "-simplify 30% keep-shapes",
    "-each 'state=STUSPS'",
    "-filter-fields state",
    `-o ${OUTPUT} format=geojson precision=0.0001 force`,
  ].join(" ")
);

await mapshaper.runCommands(
  [
    `-i ${PROVINCES_CACHE}`,
    `-filter 'iso_a2 === "CA" && ${JSON.stringify(PROVINCES)}.includes(postal)'`,
    "-simplify 40% keep-shapes",
    "-each 'state=postal'",
    "-filter-fields state",
    `-o ${PROVINCES_OUTPUT} format=geojson precision=0.0001 force`,
  ].join(" ")
);

const merged = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
merged.features.push(...JSON.parse(fs.readFileSync(PROVINCES_OUTPUT, "utf8")).features);
fs.writeFileSync(OUTPUT, `{"type":"FeatureCollection", "features": [\n${merged.features.map((f) => JSON.stringify(f)).join(",\n")}\n]}`);

const states = merged.features.map((f) => f.properties.state);
console.log(`Wrote ${states.length} states (${states.join(", ")}) to ${path.relative(ROOT, OUTPUT)}`);
