import { test } from "node:test";
import assert from "node:assert/strict";
import { placeLabel } from "../src/place";

test("wide views list the states in view", () => {
  const view = { center: [-108, 41] as [number, number], bounds: [[-113.5, 37.5], [-104.5, 44.5]] as [[number, number], [number, number]], zoom: 5 };
  assert.equal(placeLabel(view), "Western US");
  const colorado = { center: [-105.6, 39.4] as [number, number], bounds: [[-106.5, 38.5], [-104.8, 40.2]] as [[number, number], [number, number]], zoom: 5 };
  assert.equal(placeLabel(colorado), "Colorado");
});

test("closer views name the basin under the center", () => {
  const tahoe = { center: [-120.05, 39.1] as [number, number], bounds: [[-120.6, 38.8], [-119.5, 39.4]] as [[number, number], [number, number]], zoom: 8 };
  assert.match(placeLabel(tahoe) ?? "", /basin · CA, NV$/);
});

test("a state filter names the filtered states", () => {
  const view = { center: [-120, 39] as [number, number], bounds: [[-121, 38], [-119, 40]] as [[number, number], [number, number]], zoom: 8 };
  assert.equal(placeLabel(view, ["UT", "CO"]), "Colorado & Utah");
});
