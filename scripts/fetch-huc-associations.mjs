import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "data", "huc-associations.json");
const IMAP_STATIONS_URL = "https://nwcc-apps.sc.egov.usda.gov/awdb/output/stations.js";

const ID = 3, STATE = 4, NETWORK = 5, ASSOCIATED_HUCS = 11;

const res = await fetch(IMAP_STATIONS_URL);
if (!res.ok) throw new Error(`Failed to fetch iMap stations: ${res.status}`);
const js = await res.text();
const arrayText = js.slice(js.indexOf("["), js.lastIndexOf("]") + 1).replace(/,\s*\]/g, "]");
const stations = JSON.parse(arrayText);

const associations = {};
for (const s of stations) {
  if (s[NETWORK] !== "SNTL" || !s[ASSOCIATED_HUCS]?.length) continue;
  associations[`${s[ID]}:${s[STATE]}:SNTL`] = s[ASSOCIATED_HUCS];
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(associations));
console.log(`Wrote ${Object.keys(associations).length} station associations (from ${stations.length} iMap stations)`);
