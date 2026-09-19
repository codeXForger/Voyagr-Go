import { describe, expect, it } from "vitest";
import { parseTrip } from "./schema";
import { createTrip } from "./trip";

describe("parseTrip", () => {
  it("round-trips a valid trip", () => {
    const t = createTrip({ destination: "Goa" });
    expect(parseTrip(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });
  it("migrates older files with flat places and day-level activities", () => {
    const t = createTrip({ destination: "Goa", days: 1, nights: 0 });
    const legacy = JSON.parse(JSON.stringify(t));
    legacy.itinerary = [{ day: 1, title: "Day 1", places: ["Fort", "Beach"], activities: ["Cruise"], notes: "" }];
    expect(parseTrip(legacy).itinerary[0].places).toEqual([
      { name: "Fort", people: null, fee: 0, activities: [] },
      { name: "Beach", people: null, fee: 0, activities: [] },
      { name: "General activities", people: null, fee: 0, activities: [{ name: "Cruise", people: null, price: 0 }] },
    ]);
  });
  it("migrates the previous nested shape (activities as strings)", () => {
    const t = createTrip({ days: 1, nights: 0 });
    const old = JSON.parse(JSON.stringify(t));
    old.itinerary = [{ day: 1, title: "Day 1", places: [{ name: "Fort", activities: ["Tour"] }], notes: "" }];
    expect(parseTrip(old).itinerary[0].places[0]).toEqual({ name: "Fort", people: null, fee: 0, activities: [{ name: "Tour", people: null, price: 0 }] });
  });
  it("opens older files that have no start date", () => {
    const old = JSON.parse(JSON.stringify(createTrip()));
    delete old.config.startDate;
    expect(parseTrip(old).config.startDate).toBe("");
  });
  it("rejects invalid data", () => {
    expect(() => parseTrip({ id: 1 })).toThrow();
    const t = createTrip();
    expect(() => parseTrip({ ...t, config: { ...t.config, people: 0 } })).toThrow();
  });
});
