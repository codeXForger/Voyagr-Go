import { describe, expect, it, vi } from "vitest";
import { summarize } from "@/domain/pricing";
import { createTripStore } from "./tripStore";

const quotes = [
  { category: "flight" as const, unitPrice: 999, source: "t" },
  { category: "lunch" as const, unitPrice: 111, source: "t" },
  { category: "stay" as const, unitPrice: 3000, source: "t" },
  { category: "extraBed" as const, unitPrice: 800, source: "t" },
];

describe("tripStore", () => {
  it("keeps days, nights and itinerary in sync", () => {
    const s = createTripStore();
    s.getState().setDays(6);
    expect(s.getState().trip.config).toMatchObject({ days: 6, nights: 5 });
    expect(s.getState().trip.itinerary).toHaveLength(6);
    s.getState().updateDay(2, { title: "Beach" });
    s.getState().setNights(2);
    expect(s.getState().trip.itinerary).toHaveLength(3);
    expect(s.getState().trip.itinerary[1].title).toBe("Beach");
  });

  it("clamps traveler counts", () => {
    const s = createTripStore();
    s.getState().setConfig({ people: 0, roomOccupancy: -3 });
    expect(s.getState().trip.config).toMatchObject({ people: 1, roomOccupancy: 1 });
  });

  it("recalculates totals when travelers change", () => {
    const s = createTripStore();
    s.getState().addItem("flight");
    const flight = s.getState().trip.items.find((i) => i.category === "flight")!;
    s.getState().updateItem(flight.id, { unitPrice: 100 });
    s.getState().setConfig({ people: 5 });
    expect(summarize(s.getState().trip).lines.find((l) => l.item.id === flight.id)!.total).toBe(500);
  });

  it("applies quotes but preserves user-edited prices", () => {
    const s = createTripStore();
    s.getState().addItem("flight");
    const lunch = s.getState().trip.items.find((i) => i.category === "lunch")!;
    s.getState().updateItem(lunch.id, { unitPrice: 7 });
    s.getState().applyQuotes(quotes);
    const items = s.getState().trip.items;
    expect(items.find((i) => i.category === "flight")!.unitPrice).toBe(999);
    expect(items.find((i) => i.id === lunch.id)).toMatchObject({ unitPrice: 7, overridden: true });
  });

  it("fills hotel prices only where they are still empty", () => {
    const s = createTripStore();
    const a = s.getState().addStay();
    s.getState().updateStay(a, { checkIn: 1, nights: 1 });
    const b = s.getState().addStay();
    s.getState().updateStay(b, { roomPrice: 4200 });
    s.getState().applyQuotes(quotes);
    const [first, second] = s.getState().trip.stays;
    expect(first).toMatchObject({ roomPrice: 3000, extraBedPrice: 800 });
    expect(second).toMatchObject({ roomPrice: 4200, extraBedPrice: 800 }); // your price is kept
  });

  it("adds hotels into free nights, keeps them in check-in order, and removes them", () => {
    const s = createTripStore();
    const first = s.getState().addStay();
    expect(s.getState().trip.stays[0]).toMatchObject({ checkIn: 1, nights: 3 }); // default trip: 3 nights
    s.getState().updateStay(first, { nights: 1 });
    const second = s.getState().addStay();
    expect(s.getState().trip.stays.find((x) => x.id === second)).toMatchObject({ checkIn: 2, nights: 2 });
    s.getState().updateStay(first, { checkIn: 3, nights: 1 }); // now later than the second
    expect(s.getState().trip.stays.map((x) => x.id)).toEqual([second, first]);
    s.getState().updateStay(first, { nights: 0, extraBeds: -2, rooms: 0 });
    expect(s.getState().trip.stays.find((x) => x.id === first)).toMatchObject({ nights: 1, extraBeds: 0, rooms: 1 });
    s.getState().removeStay(second);
    expect(s.getState().trip.stays.map((x) => x.id)).toEqual([first]);
  });

  it("can add a hotel for a chosen run of nights", () => {
    const s = createTripStore();
    s.getState().addStay({ checkIn: 2, nights: 2 });
    expect(s.getState().trip.stays[0]).toMatchObject({ checkIn: 2, nights: 2 });
  });

  it("sets a hotel's room or extra-bed price", () => {
    const s = createTripStore();
    const id = s.getState().addStay();
    s.getState().setStayPrice(id, "room", 3500);
    s.getState().setStayPrice(id, "bed", 900);
    expect(s.getState().trip.stays[0]).toMatchObject({ roomPrice: 3500, extraBedPrice: 900 });
  });

  it("refreshPrices reports loading/error states", async () => {
    const s = createTripStore();
    await s.getState().refreshPrices({ fetchQuotes: vi.fn().mockResolvedValue(quotes) });
    expect(s.getState().pricing).toBe("idle");
    await s.getState().refreshPrices({ fetchQuotes: vi.fn().mockRejectedValue(new Error("x")) });
    expect(s.getState().pricing).toBe("error");
  });

  it("derives trip length from the end date and keeps the start date", () => {
    const s = createTripStore();
    s.getState().setStartDate("2026-10-12");
    s.getState().setEndDate("2026-10-16");
    expect(s.getState().trip.config).toMatchObject({ startDate: "2026-10-12", nights: 4, days: 5 });
    expect(s.getState().trip.itinerary).toHaveLength(5);
    s.getState().setEndDate("2026-10-01"); // before the start: ignored
    expect(s.getState().trip.config.nights).toBe(4);
    s.getState().setEndDate("garbage");
    expect(s.getState().trip.config.nights).toBe(4);
  });

  it("sets the start date from the end date when none is chosen", () => {
    const s = createTripStore();
    s.getState().setEndDate("2026-10-15"); // default 3 nights
    expect(s.getState().trip.config.startDate).toBe("2026-10-12");
  });

  it("caps very long ranges", () => {
    const s = createTripStore();
    s.getState().setStartDate("2026-01-01");
    s.getState().setEndDate("2030-01-01");
    expect(s.getState().trip.config.nights).toBe(90);
  });

  it("adds and removes items", () => {
    const s = createTripStore();
    s.getState().addItem("flight");
    const added = s.getState().trip.items.at(-1)!;
    expect(added.category).toBe("flight");
    s.getState().removeItem(added.id);
    expect(s.getState().trip.items).toHaveLength(3);
  });

  it("does not let places or activities be added by hand (they come from the itinerary)", () => {
    const s = createTripStore();
    s.getState().addItem("activities");
    s.getState().addItem("places");
    s.getState().addItem("transfers");
    expect(s.getState().trip.items).toHaveLength(3);
  });

  it("sets a linked price on the itinerary", () => {
    const s = createTripStore();
    s.getState().updateDay(1, { places: [{ name: "Fort", people: null, fee: 0, activities: [{ name: "Tour", people: null, price: 500 }] }] });
    s.getState().setLinkedPrice({ day: 1, place: 0, activity: 0 }, 800);
    expect(s.getState().trip.itinerary[0].places[0].activities[0].price).toBe(800);
  });
});
