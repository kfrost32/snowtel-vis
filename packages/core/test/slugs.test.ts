import { test } from "node:test";
import assert from "node:assert/strict";
import { basinPath, findBasinHuc } from "../src/basins";
import { findStation, getAllStations, stationPath, stationSlug } from "../src/stations";
import { HUC2_NAMES, HUC4_NAMES } from "../src/huc-names";

test("every station has a unique slug that resolves back to it", () => {
  const stations = getAllStations();
  const slugs = stations.map((s) => stationSlug(s.triplet));
  assert.equal(new Set(slugs).size, stations.length);
  for (const station of stations) assert.equal(findStation(stationSlug(station.triplet))?.triplet, station.triplet);
});

test("station paths use the name and state, and old dashed triplets still resolve", () => {
  assert.equal(stationPath("669:CO:SNTL"), "/station/north-lost-trail-co");
  assert.equal(findStation("669-CO-SNTL")?.triplet, "669:CO:SNTL");
  assert.equal(findStation("not-a-station"), undefined);
});

test("SNOTEL keeps the plain slug when another network shares the name", () => {
  assert.equal(stationSlug("1050:CA:SNTL"), "horse-meadow-ca");
  assert.equal(stationSlug("HRS:CA:CDEC"), "horse-meadow-ca-cdec");
});

test("every basin path resolves back to its HUC, and numeric HUCs still resolve", () => {
  for (const huc of [...Object.keys(HUC2_NAMES), ...Object.keys(HUC4_NAMES)]) {
    assert.equal(findBasinHuc(basinPath(huc).replace("/basins/", "")), huc);
  }
  assert.equal(basinPath("14"), "/basins/upper-colorado");
  assert.equal(findBasinHuc("14"), "14");
  assert.equal(findBasinHuc("nope"), undefined);
});
