import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mapshaper from "mapshaper";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCE_URL = "https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_state_20m.zip";
const CACHE = path.join(ROOT, "node_modules", ".cache", "snotel-states", "cb_2023_us_state_20m.zip");
const OUTPUT = path.join(ROOT, "packages", "core", "data", "state-boundaries.json");

const stations = JSON.parse(fs.readFileSync(path.join(ROOT, "packages", "core", "data", "stations.json"), "utf8"));
const snotelStates = [...new Set(stations.features.map((f) => f.properties.state))].sort();

if (!fs.existsSync(CACHE)) {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Census download failed: HTTP ${res.status}`);
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, Buffer.from(await res.arrayBuffer()));
}

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

const states = JSON.parse(fs.readFileSync(OUTPUT, "utf8")).features.map((f) => f.properties.state);
console.log(`Wrote ${states.length} states (${states.join(", ")}) to ${path.relative(ROOT, OUTPUT)}`);
