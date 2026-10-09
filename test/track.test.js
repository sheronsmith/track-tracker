import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseTime,
  formatTime,
  personalRecords,
  predictTime,
  goalSplits,
  racesInYear,
} from "../track.js";

test("parseTime reads seconds and minutes", () => {
  assert.equal(parseTime("52.3"), 52.3);
  assert.equal(parseTime("1:58.4"), 118.4);
  assert.equal(parseTime("4:45"), 285);
});

test("parseTime rejects bad input", () => {
  assert.equal(parseTime("abc"), null);
  assert.equal(parseTime("1:75"), null);
  assert.equal(parseTime(""), null);
});

test("formatTime shows minutes only when needed", () => {
  assert.equal(formatTime(52.3), "52.30");
  assert.equal(formatTime(118.4), "1:58.40");
  assert.equal(formatTime(285), "4:45.00");
});

test("personalRecords picks the fastest time per event", () => {
  const races = [
    { event: "400m", time: 55, date: "2026-03-01" },
    { event: "400m", time: 53.2, date: "2026-04-01" },
    { event: "800m", time: 125, date: "2026-04-01" },
  ];
  const pr = personalRecords(races);
  assert.equal(pr["400m"].time, 53.2);
  assert.equal(pr["800m"].time, 125);
});

test("predictTime uses the Riegel formula", () => {
  // A 2:00 800 predicts about a 4:12 mile.
  const mile = predictTime(120, 800, 1609);
  assert.ok(mile > 248 && mile < 256);
});

test("goalSplits gives even paces", () => {
  const splits = goalSplits(120, 800);
  assert.deepEqual(
    splits.map((s) => [s.meters, Math.round(s.seconds)]),
    [[100, 15], [200, 30], [400, 60]]
  );
});

test("racesInYear filters by year", () => {
  const races = [
    { date: "2025-05-01" },
    { date: "2026-05-01" },
  ];
  assert.equal(racesInYear(races, 2026).length, 1);
});
