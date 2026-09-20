import { describe, expect, it } from "vitest";
import { createTrip } from "@/domain/trip";
import { buildReport } from "./report";

describe("buildReport", () => {
  const trip = createTrip({ origin: "Delhi", destination: "Goa", people: 2, days: 3, nights: 2 });
  trip.items.unshift({ id: "f", category: "flight", label: "Flight", unitPrice: 5000, basis: "perPerson", count: 1, overridden: false });
  const r = buildReport(trip, 3);

  it("builds a readable subtitle", () => {
    expect(r.title).toBe("Trip to Goa");
    expect(r.subtitle).toBe("Delhi to Goa  |  3 days / 2 nights  |  2 travelers");
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
    expect(daily.rows.map((x) => x.category)).toEqual(["Breakfast", "Lunch", "Dinner"]);
    expect(daily.perDay).toBeDefined();
    expect(once.rows.map((x) => x.category)).toEqual(["Flights"]);
    expect(once.perDay).toBeUndefined();
  });
  it("includes itinerary days and scenarios", () => {
    expect(r.itinerary).toHaveLength(3);
    expect(r.scenarios.map((s) => s.people)).toEqual([1, 2, 3]);
  });
});

describe("buildReport for the branded PDF", () => {
  const trip = createTrip({ origin: "Delhi", destination: "Goa", people: 4, days: 3, nights: 2, startDate: "2026-10-12" });
  trip.name = "Goa Escape";
  trip.stays = [{ id: "a", name: "Sea View", checkIn: 1, nights: 2, roomPrice: 4000, rooms: null, guestsPerRoom: 2, extraBeds: 0, extraBedPrice: 0 }];
  trip.itinerary[0].places = [
    { name: "Sea View", time: "11:00", transferIn: null, people: null, fee: 0, parking: 0, activities: [] },
    { name: "Fort", time: "", transferIn: null, people: null, fee: 0, parking: 0, activities: [{ name: "Free walk", time: "", people: null, price: 0 }, { name: "Tour", time: "", people: 2, price: 500 }] },
  ];
  const r = buildReport(trip, 2, new Date("2026-09-20T10:00:00Z"));

  it("has a cover with route, dates, chips and a prepared-on date", () => {
    expect(r.brand).toBe("Voyagr-Go");
    expect(r.generatedOn).toBe("20 September 2026");
    expect(r.cover).toMatchObject({ from: "Delhi", to: "Goa", dates: "12 Oct to 14 Oct 2026" });
    expect(r.cover.chips).toEqual(["3 days, 2 nights", "4 travelers", "1 hotel"]);
    expect(r.people).toBe(4);
    expect(r.disclaimer).toContain("estimates");
  });

  it("gives each cost type a color, per-person amount and share of the total", () => {
    const stay = r.categoryTotals.find((c) => c.label === "Stay")!;
    expect(stay.color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(stay.total).toContain("16,000"); // 2 rooms x 2 nights x 4000
    expect(stay.perPerson).toContain("4,000");
    expect(r.categoryTotals.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1, 5);
  });

  it("colors each hotel and describes hotel activity on each day", () => {
    expect(r.stays[0].color).toMatch(/^#/);
    expect(r.itinerary[0].lodging).toEqual(["Check in to Sea View"]);
    expect(r.itinerary[1].lodging).toEqual(["Staying at Sea View"]);
    expect(r.itinerary[2].lodging).toEqual(["Check out of Sea View"]);
    expect(r.itinerary[0].hotelNames).toEqual(["Sea View"]);
    expect(r.itinerary[0].day).toBe(1);
  });

  it("leaves free itinerary items out of the cost tables but keeps them on the itinerary", () => {
    const labels = r.costRows.map((x) => x.label);
    expect(labels).toContain("Tour");
    expect(labels).not.toContain("Free walk");
    expect(labels).not.toContain("Fort entry"); // no entry fee
    const fort = r.itinerary[0].places[1];
    expect(fort.activities.map((a) => a.name)).toEqual(["Free walk", "Tour"]);
    expect(fort.activities[0].detail).toBe("4 people, no charge");
    expect(fort.activities[1].detail).toContain("2 people x");
  });

  it("explains where each cost row comes from and shows an empty day cost as blank", () => {
    expect(r.costRows.find((x) => x.label === "Tour")!.note).toContain("at Fort");
    expect(r.itinerary[0].dayCost).toContain("1,000");
    expect(r.itinerary[1].dayCost).toBe("");
  });
});
