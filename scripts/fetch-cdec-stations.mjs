import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(ROOT, "packages", "core", "data", "cdec-stations.json");
const SENSORS_URL = "https://cdec.water.ca.gov/reportapp/javareports?name=SnowSensors";
const NRCS_OPERATOR = "Natural Resources Conservation Service";
const DUPLICATE_KM = 0.5;
const UPPERCASE_WORDS = new Set(["II", "III", "IV", "USFS", "PG&E", "SCE", "SMUD"]);

function text(cell) {
  return cell
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function titleCase(name) {
  return name
    .replace(/\s*\([^)]*\)\s*$/, "")
    .split(/\s+/)
    .map((word) => (UPPERCASE_WORDS.has(word) ? word : word.charAt(0) + word.slice(1).toLowerCase()))
    .join(" ")
    .replace(/\bMc(\w)/g, (_, c) => `Mc${c.toUpperCase()}`);
}

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

const res = await fetch(SENSORS_URL);
if (!res.ok) throw new Error(`${SENSORS_URL}: HTTP ${res.status}`);
const html = await res.text();

const snotel = JSON.parse(fs.readFileSync(path.join(ROOT, "packages", "core", "data", "stations.json"), "utf8"))
  .features.map((f) => f.properties)
  .filter((p) => p.network === "SNOTEL");

const rows = [...html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)].map(([, row]) => [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map(([, cell]) => text(cell)));
const listed = rows.filter((cells) => cells.length === 7 && /^[A-Z0-9]{3}$/.test(cells[0]));

const stations = listed
  .filter(([, , , , , , operator]) => operator !== NRCS_OPERATOR)
  .map(([id, name, elevation, latitude, longitude]) => ({
    id,
    name: titleCase(name),
    latitude: Math.round(Number(latitude) * 1e5) / 1e5,
    longitude: Math.round(Number(longitude) * 1e5) / 1e5,
    elevation_ft: Number(elevation),
  }))
  .filter((s) => !snotel.some((p) => distanceKm(s, p) < DUPLICATE_KM))
  .sort((a, b) => a.id.localeCompare(b.id));

fs.writeFileSync(OUTPUT, `[\n${stations.map((s) => JSON.stringify(s)).join(",\n")}\n]\n`);
console.log(`Wrote ${stations.length} CDEC stations to ${path.relative(ROOT, OUTPUT)} (${listed.length} listed, NRCS sites and SNOTEL duplicates left out)`);
