import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "data", "station-conditions.json");
const STATIONS_PATH = path.join(__dirname, "..", "data", "stations.json");
const SOAP_URL = "https://wcc.sc.egov.usda.gov/awdbWebService/services";
const MAX_BATCH_SIZE = 300;

const STATE_ABBREV = {
  Alaska: "AK", Arizona: "AZ", California: "CA", Colorado: "CO",
  Idaho: "ID", Montana: "MT", Nevada: "NV", "New Mexico": "NM",
  Oregon: "OR", "South Dakota": "SD", Utah: "UT", Washington: "WA", Wyoming: "WY",
};
const M_TO_FT = 3.28084;

function buildSoapEnvelope(method, params) {
  return `<?xml version="1.0"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://www.wcc.nrcs.usda.gov/ns/awdbWebService">
<soapenv:Body><web:${method}>${params}</web:${method}></soapenv:Body>
</soapenv:Envelope>`;
}

async function soapRequest(method, params) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(SOAP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: buildSoapEnvelope(method, params),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`SOAP failed: ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseNumericValue(val) {
  if (!val || val === "" || val === "-99.9" || val === "-99.0") return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function extractReturnBlocks(xml) {
  const blocks = [];
  let idx = 0;
  while (true) {
    const start = xml.indexOf("<return>", idx);
    if (start === -1) break;
    const end = xml.indexOf("</return>", start);
    if (end === -1) break;
    blocks.push(xml.substring(start + 8, end));
    idx = end + 9;
  }
  return blocks;
}

function extractTag(block, tag) {
  const start = block.indexOf(`<${tag}>`);
  if (start === -1) return null;
  const end = block.indexOf(`</${tag}>`, start);
  if (end === -1) return null;
  return block.substring(start + tag.length + 2, end);
}

function extractAllTags(block, tag) {
  const results = [];
  let idx = 0;
  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;
  while (true) {
    const start = block.indexOf(openTag, idx);
    if (start === -1) break;
    const end = block.indexOf(closeTag, start);
    if (end === -1) break;
    results.push(block.substring(start + openTag.length, end));
    idx = end + closeTag.length;
  }
  return results;
}

function parseGetDataResponse(xml) {
  const result = new Map();
  const blocks = extractReturnBlocks(xml);
  for (const block of blocks) {
    const triplet = extractTag(block, "stationTriplet");
    if (!triplet) continue;
    const rawValues = extractAllTags(block, "values");
    result.set(triplet, rawValues.map(v => parseNumericValue(v)));
  }
  return result;
}

function parseCentralTendencyResponse(xml) {
  const results = [];
  const blocks = extractReturnBlocks(xml);
  for (const block of blocks) {
    const rawValues = extractAllTags(block, "values");
    results.push(rawValues.map(v => parseNumericValue(v)));
  }
  return results;
}

function tripletParams(triplets) {
  return triplets.map(t => `<stationTriplets>${t}</stationTriplets>`).join("");
}

async function fetchElement(triplets, elementCd, beginDate, endDate) {
  const batches = [];
  for (let i = 0; i < triplets.length; i += MAX_BATCH_SIZE) {
    batches.push(triplets.slice(i, i + MAX_BATCH_SIZE));
  }
  const results = await Promise.all(
    batches.map(batch =>
      soapRequest("getData", `${tripletParams(batch)}<elementCd>${elementCd}</elementCd><ordinal>1</ordinal><duration>DAILY</duration><getFlags>false</getFlags><beginDate>${beginDate}</beginDate><endDate>${endDate}</endDate><alwaysReturnDailyFeb29>false</alwaysReturnDailyFeb29>`)
        .then(parseGetDataResponse)
        .catch(e => { console.error(`  Failed ${elementCd} batch:`, e.message); return new Map(); })
    )
  );
  const merged = new Map();
  for (const map of results) for (const [k, v] of map) merged.set(k, v);
  return merged;
}

async function fetchMedian(triplets, beginMonth, beginDay, endMonth, endDay) {
  const batches = [];
  for (let i = 0; i < triplets.length; i += MAX_BATCH_SIZE) {
    batches.push(triplets.slice(i, i + MAX_BATCH_SIZE));
  }
  const batchResults = await Promise.all(
    batches.map(batch =>
      soapRequest("getCentralTendencyData", `${tripletParams(batch)}<elementCd>WTEQ</elementCd><duration>DAILY</duration><getFlags>false</getFlags><centralTendencyType>MEDIAN</centralTendencyType><beginMonth>${beginMonth}</beginMonth><beginDay>${beginDay}</beginDay><endMonth>${endMonth}</endMonth><endDay>${endDay}</endDay>`)
        .then(xml => ({ triplets: batch, data: parseCentralTendencyResponse(xml) }))
        .catch(e => { console.error(`  Failed median batch:`, e.message); return { triplets: batch, data: [] }; })
    )
  );
  const result = new Map();
  for (const { triplets: bt, data } of batchResults) {
    for (let i = 0; i < bt.length; i++) {
      const vals = data[i] || [];
      result.set(bt[i], vals[0] ?? null);
    }
  }
  return result;
}

async function main() {
  console.log("Loading stations...");
  const geojson = JSON.parse(fs.readFileSync(STATIONS_PATH, "utf8"));
  const stations = geojson.features
    .filter(f => f.properties.csvData && (f.properties.network === "SNOTEL" || f.properties.network === "Snow Course"))
    .map(f => {
      const p = f.properties;
      return {
        triplet: p.code.replace(/_/g, ":"),
        name: p.name,
        state: STATE_ABBREV[p.state] || p.state,
        latitude: p.latitude,
        longitude: p.longitude,
        elevation: Math.round(p.elevation_m * M_TO_FT),
        huc: p.HUC,
        beginDate: (p.beginDate || "").split(/[T ]/)[0],
        network: p.network,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const snotelStations = stations.filter(s => s.network === "SNOTEL");
  const snotelTriplets = snotelStations.map(s => s.triplet);
  const today = new Date();
  const endDate = today.toISOString().split("T")[0];
  const beginDate = new Date(today);
  beginDate.setDate(beginDate.getDate() - 8);
  const beginStr = beginDate.toISOString().split("T")[0];

  console.log(`Fetching data for ${snotelTriplets.length} SNOTEL stations via SOAP...`);
  const start = Date.now();

  const [wteqData, snwdData, precData, tobsData, medianData] = await Promise.all([
    fetchElement(snotelTriplets, "WTEQ", beginStr, endDate).then(r => { console.log(`  WTEQ: ${r.size} stations`); return r; }),
    fetchElement(snotelTriplets, "SNWD", beginStr, endDate).then(r => { console.log(`  SNWD: ${r.size} stations`); return r; }),
    fetchElement(snotelTriplets, "PREC", beginStr, endDate).then(r => { console.log(`  PREC: ${r.size} stations`); return r; }),
    fetchElement(snotelTriplets, "TOBS", beginStr, endDate).then(r => { console.log(`  TOBS: ${r.size} stations`); return r; }),
    fetchMedian(snotelTriplets, today.getMonth() + 1, today.getDate(), today.getMonth() + 1, today.getDate()).then(r => { console.log(`  Median: ${r.size} stations`); return r; }),
  ]);

  console.log(`Fetched in ${((Date.now() - start) / 1000).toFixed(1)}s`);

  const empty = { swe: null, sweNormal: null, pctOfNormal: null, snowDepth: null, temp: null, precipAccum: null, sweChange1d: null, sweChange7d: null, depthChange1d: null, depthChange3d: null, lastUpdated: endDate };
  const results = [];

  for (const station of stations) {
    if (station.network !== "SNOTEL") {
      results.push({ ...station, ...empty });
      continue;
    }

    const wteq = wteqData.get(station.triplet) || [];
    const snwd = snwdData.get(station.triplet) || [];
    const prec = precData.get(station.triplet) || [];
    const tobs = tobsData.get(station.triplet) || [];
    const sweNormal = medianData.get(station.triplet) ?? null;

    const latest = wteq.length - 1;
    const swe = latest >= 0 ? wteq[latest] : null;
    const snowDepth = snwd.length > 0 ? snwd[snwd.length - 1] : null;
    const precipAccum = prec.length > 0 ? prec[prec.length - 1] : null;
    const temp = tobs.length > 0 ? tobs[tobs.length - 1] : null;

    const pctOfNormal = swe !== null && sweNormal !== null && sweNormal > 0
      ? Math.round((swe / sweNormal) * 100)
      : null;

    let sweChange1d = null;
    if (latest >= 1 && swe !== null && wteq[latest - 1] !== null) {
      sweChange1d = Math.round((swe - wteq[latest - 1]) * 10) / 10;
    }

    let sweChange3d = null;
    if (latest >= 3 && swe !== null && wteq[latest - 3] !== null) {
      sweChange3d = Math.round((swe - wteq[latest - 3]) * 10) / 10;
    }

    let sweChange7d = null;
    if (latest >= 7 && swe !== null && wteq[latest - 7] !== null) {
      sweChange7d = Math.round((swe - wteq[latest - 7]) * 10) / 10;
    }

    const snwdLatest = snwd.length - 1;
    let depthChange1d = null;
    if (snwdLatest >= 1 && snwd[snwdLatest] !== null && snwd[snwdLatest - 1] !== null) {
      depthChange1d = Math.round(snwd[snwdLatest] - snwd[snwdLatest - 1]);
    }

    let depthChange3d = null;
    if (snwdLatest >= 3 && snwd[snwdLatest] !== null && snwd[snwdLatest - 3] !== null) {
      depthChange3d = Math.round(snwd[snwdLatest] - snwd[snwdLatest - 3]);
    }

    results.push({
      ...station,
      swe, sweNormal, pctOfNormal, snowDepth, temp, precipAccum,
      sweChange1d, sweChange3d, sweChange7d, depthChange1d, depthChange3d, lastUpdated: endDate,
    });
  }

  const withData = results.filter(s => s.swe !== null).length;
  console.log(`Writing ${results.length} stations (${withData} with SWE data) to station-conditions.json`);

  const output = { timestamp: Date.now(), data: results };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  console.log("Done.");
}

main().catch(e => {
  console.error("Prebuild failed:", e.message);
  if (fs.existsSync(OUTPUT_PATH)) {
    console.log("Keeping stale station-conditions.json");
    process.exit(0);
  }
  process.exit(1);
});
