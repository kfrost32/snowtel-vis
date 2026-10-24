import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SOURCE_URL = "https://tiles.openskimap.org/geojson/ski_areas.geojson";
const OUTPUT = path.join(ROOT, "packages", "core", "data", "ski-areas.json");
const MIN_RUNS = 3;
const METERS_TO_FEET = 3.28084;

const stations = JSON.parse(fs.readFileSync(path.join(ROOT, "packages", "core", "data", "stations.json"), "utf8"));
const snotelStates = new Set(stations.features.map((f) => f.properties.state));

function usState(props) {
  return (props.places ?? []).find((p) => p.iso3166_1Alpha2 === "US")?.iso3166_2?.slice(3) ?? null;
}

function runCount(props) {
  const byDifficulty = props.statistics?.runs?.byActivity?.downhill?.byDifficulty ?? {};
  return Object.values(byDifficulty).reduce((sum, d) => sum + d.count, 0);
}

function representativePoint(geometry) {
  if (geometry.type === "Point") return geometry.coordinates;
  const ring = geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.coordinates[0][0];
  const [x, y] = ring.reduce(([sx, sy], [px, py]) => [sx + px, sy + py], [0, 0]);
  return [x / ring.length, y / ring.length];
}

const toFeet = (meters) => (meters == null ? null : Math.round(meters * METERS_TO_FEET));

const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`OpenSkiMap download failed: HTTP ${res.status}`);
const source = await res.json();

const areas = source.features
  .filter((f) => {
    const p = f.properties;
    const state = usState(p);
    return (
      p.name &&
      state &&
      snotelStates.has(state) &&
      p.status === "operating" &&
      p.activities.includes("downhill") &&
      runCount(p) >= MIN_RUNS
    );
  })
  .map((f) => {
    const p = f.properties;
    const [lon, lat] = representativePoint(f.geometry);
    const runs = p.statistics?.runs ?? {};
    return {
      id: p.id,
      name: p.name,
      state: usState(p),
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lon * 10000) / 10000,
      baseElevation: toFeet(runs.minElevation),
      summitElevation: toFeet(runs.maxElevation),
      runs: runCount(p),
      website: p.websites?.[0] ?? null,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(OUTPUT, JSON.stringify(areas, null, 2) + "\n");
console.log(`Wrote ${areas.length} ski areas to ${path.relative(ROOT, OUTPUT)}`);
