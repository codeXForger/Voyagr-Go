import { describe, expect, it } from "vitest";
import { createTrip } from "@/domain/trip";
import { buildReport } from "./report";

describe("buildReport", () => {
  const trip = createTrip({ origin: "Delhi", destination: "Goa", people: 2, days: 3, nights: 2, extraBeds: 1 });
  trip.items[0].unitPrice = 5000; // flight
  const r = buildReport(trip, 3);

  it("builds a readable subtitle", () => {
    expect(r.title).toBe("Trip to Goa");
    expect(r.subtitle).toBe("Delhi to Goa  |  3 days / 2 nights  |  2 travelers  |  1 room  |  1 extra bed");
  });
  it("includes dates when a start date is set", () => {
    const dated = createTrip({ origin: "Delhi", destination: "Goa", days: 2, nights: 1, startDate: "2026-10-12" });
    const rd = buildReport(dated, 2);
    expect(rd.subtitle).toContain("12 Oct to 13 Oct 2026");
    expect(rd.itinerary[0].date).toContain("12 Oct");
    expect(rd.itinerary[1].date).toContain("13 Oct");
    expect(r.itinerary[0].date).toBe("");
  });
  it("formats cost rows with currency codes and icons", () => {
    expect(r.costRows[0]).toMatchObject({ icon: "plane", quantity: 2 });
    expect(r.costRows[0].total).toContain("10,000");
    expect(r.costRows[0].total).toContain("INR");
    expect(r.grandTotal).toContain("10,000");
  });
  it("splits costs into daily and trip sections with per-day figures", () => {
    const [daily, once] = r.costSections;
    expect(daily.title).toBe("Daily charges");
    expect(daily.rows.map((x) => x.category)).toEqual(["Stay", "Extra bed", "Cab", "Breakfast", "Lunch", "Dinner"]);
    expect(daily.perDay).toBeDefined();
    expect(once.rows.map((x) => x.category)).toEqual(["Flights"]);
    expect(once.perDay).toBeUndefined();
  });
  it("includes itinerary days and scenarios", () => {
    expect(r.itinerary).toHaveLength(3);
    expect(r.scenarios.map((s) => s.people)).toEqual([1, 2, 3]);
  });
});
