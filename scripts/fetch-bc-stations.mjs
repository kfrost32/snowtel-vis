import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(ROOT, "packages", "core", "data", "bc-stations.json");
const WFS_URL =
  "https://openmaps.gov.bc.ca/geo/pub/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=WHSE_WATER_MANAGEMENT.SSL_SNOW_ASWS_STNS_SP&outputFormat=json&srsName=EPSG:4326";
const CURRENT_SWE_URL = "https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data/SW.csv";

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

const geo = await (await get(WFS_URL)).json();
const header = (await (await get(CURRENT_SWE_URL)).text()).split("\n", 1)[0].split(",").slice(1);
const reporting = new Set(header.map((column) => column.split(" ")[0]));

const stations = geo.features
  .map((f) => f.properties)
  .filter((p) => p.STATUS === "Active" && reporting.has(p.LOCATION_ID))
  .map((p) => ({
    id: p.LOCATION_ID,
    name: p.LOCATION_NAME.trim(),
    latitude: Math.round(p.LATITUDE * 1e5) / 1e5,
    longitude: Math.round(p.LONGITUDE * 1e5) / 1e5,
    elevation_m: p.ELEVATION,
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

fs.writeFileSync(OUTPUT, `[\n${stations.map((s) => JSON.stringify(s)).join(",\n")}\n]\n`);
console.log(`Wrote ${stations.length} BC stations to ${path.relative(ROOT, OUTPUT)} (${reporting.size} in the current-season file)`);
