// Run: node tests/overtime-self-check.js
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const context = {
  Utilities: { formatDate: (date, _tz, format) => format === "yyyy-MM-dd" ? date.toISOString().slice(0, 10) : date.toISOString().slice(11, 16) },
  getConfig: () => ({ TIMEZONE: "UTC" }),
  Date
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("Utils.gs", "utf8"), context);

const entries = [
  { timeInterval: { start: "2026-01-02T08:00:00.000Z", end: "2026-01-02T16:00:00.000Z" } },
  { timeInterval: { start: "2026-01-02T18:00:00.000Z", end: "2026-01-02T20:00:00.000Z" } }
];
const day = context.calculateOvertimeByDate_(entries, 8)["2026-01-02"];
assert.strictEqual(day.overtimeMs, 2 * 60 * 60 * 1000);
assert.strictEqual(day.ranges[0].start.toISOString(), "2026-01-02T18:00:00.000Z");
assert.strictEqual(day.ranges[0].end.toISOString(), "2026-01-02T20:00:00.000Z");
console.log("overtime self-check passed");

const clockify = fs.readFileSync("Clockify.gs", "utf8");
const rangeFn = clockify.match(/function getClockifyEntriesByDateRange[\s\S]*?\n  return clockifyRequest\("GET", path\);\n}/);
assert(rangeFn, "date-range retrieval function should exist");
assert(rangeFn[0].includes("start="), "range retrieval should filter by start date");
assert(rangeFn[0].includes("end="), "range retrieval should filter by end date");
assert(rangeFn[0].includes("page-size=5000"), "range retrieval should request a large page size");
console.log("Clockify date-filter self-check passed");