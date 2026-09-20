import { describe, expect, it } from "vitest";
import { lineCost, round2, scenarioTable, summarize } from "./pricing";
import { registerStrategy } from "./strategies";
import { createTrip, withDays, withNights } from "./trip";
import type { CostItem } from "./types";

const item = (over: Partial<CostItem>): CostItem => ({
  id: "x", category: "flight", label: "x", unitPrice: 100, basis: "perPerson", count: 1, overridden: false, ...over,
});
const cfg = { ...createTrip().config, people: 4, days: 5, nights: 4 };

describe("pricing strategies", () => {
  it.each([
    ["perPerson", 4],
    ["perVehicleDay", 5],
    ["perPersonDay", 20],
    ["perPersonNight", 16],
    ["flat", 1],
  ] as const)("%s quantity", (basis, qty) => {
    expect(lineCost(cfg, item({ basis })).quantity).toBe(qty);
  });

  it("scales cab count by vehicle capacity", () => {
    const c = { ...cfg, people: 5 };
    expect(lineCost(c, item({ basis: "perVehicleDay" })).quantity).toBe(10);
  });

  it("applies the count multiplier", () => {
    expect(lineCost(cfg, item({ count: 3 })).total).toBe(1200);
  });

  it("handles zero counts and negative prices safely", () => {
    expect(lineCost(cfg, item({ basis: "flat", unitPrice: -5 })).total).toBe(0);
    expect(lineCost(cfg, item({ count: 0 })).total).toBe(0);
  });

  it("supports registering a new strategy (open/closed)", () => {
    registerStrategy("flat", { quantity: () => 7 });
    expect(lineCost(cfg, item({ basis: "flat" })).quantity).toBe(7);
    registerStrategy("flat", { quantity: (_c, i) => i.count });
  });
});

describe("summarize", () => {
  it("computes unit, per-person, total and category totals", () => {
    const trip = { config: cfg, items: [item({ unitPrice: 100 }), item({ id: "y", category: "stay", basis: "perPerson", unitPrice: 100 })] };
    const s = summarize(trip);
    expect(s.lines[0]).toMatchObject({ unitPrice: 100, total: 400, perPerson: 100 });
    expect(s.categoryTotals).toEqual({ flight: 400, stay: 400 });
    expect(s.grandTotal).toBe(800);
    expect(s.perPerson).toBe(200);
  });

  it("rounds to 2 decimals", () => {
    expect(round2(1.005 + 0.001)).toBe(1.01);
    const s = summarize({ config: { ...cfg, people: 3 }, items: [item({ basis: "flat", unitPrice: 10 })] });
    expect(s.perPerson).toBe(3.33);
  });
});

describe("scenarioTable", () => {
  it("returns a row per group size with rooms scaled and cab shared", () => {
    const trip = {
      config: { ...cfg, people: 2, days: 2, nights: 1 },
      items: [item({ basis: "perVehicleDay", unitPrice: 1000 })],
      // One hotel for the single night, rooms set to "as many as needed" so it scales with the group.
      stays: [{ id: "h", name: "Hotel", checkIn: 1, nights: 1, roomPrice: 500, rooms: null, guestsPerRoom: 2, extraBeds: 0, extraBedPrice: 0 }],
    };
    const rows = scenarioTable(trip, 5);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ people: 1, rooms: 1, total: 2500, perPerson: 2500 });
    expect(rows[3]).toMatchObject({ people: 4, rooms: 2, total: 3000, perPerson: 750 });
    expect(rows[4]).toMatchObject({ people: 5, rooms: 3, total: 2 * 2 * 1000 + 3 * 500 });
  });
});

describe("trip helpers", () => {
  it("keeps days and nights consistent", () => {
    expect(withDays(createTrip().config, 6)).toMatchObject({ days: 6, nights: 5 });
    expect(withNights(createTrip().config, 2)).toMatchObject({ days: 3, nights: 2 });
    expect(withDays(createTrip().config, 0)).toMatchObject({ days: 1, nights: 0 });
  });

  it("creates one default item per category and itinerary per day", () => {
    const t = createTrip({ destination: "Goa", days: 3, nights: 2 });
    expect(t.items).toHaveLength(3); // hotels, places, activities, transfers (and flights) come from the itinerary
    expect(t.itinerary).toHaveLength(3);
    expect(t.name).toBe("Trip to Goa");
  });
});
