import { describe, expect, it } from "vitest";
import { dayCost, itineraryItems, withLinkedPrice } from "./itineraryCosts";
import { summarize } from "./pricing";
import { modeOf, newTransfer, transferFrom, withMode } from "./transfers";
import { createTrip, newPlace } from "./trip";
import type { PlaceStop, Transfer, Trip } from "./types";

const tripWith = (places: PlaceStop[], people = 4): Trip => {
  const t = createTrip({ people, days: 2, nights: 1 });
  t.itinerary[0].places = places;
  return t;
};
const place = (name: string, transferIn: Transfer | null = null, fee = 0): PlaceStop => ({ ...newPlace(), name, transferIn, fee });

describe("transfer modes", () => {
  it("bills cabs per group and ferries per person by default", () => {
    expect(newTransfer("cab").billing).toBe("group");
    expect(newTransfer("ferry").billing).toBe("perPerson");
    expect(withMode(newTransfer("cab"), "bus")).toMatchObject({ mode: "bus", billing: "perPerson" });
    expect(modeOf("ferry").icon).toBe("ship");
  });
  it("names where a transfer starts", () => {
    expect(transferFrom(newTransfer(), "Hotel")).toBe("Hotel");
    expect(transferFrom({ ...newTransfer(), from: " Airport " }, "Hotel")).toBe("Airport");
    expect(transferFrom(newTransfer(), undefined)).toBe("Start");
  });
});

describe("transfer costs", () => {
  const cab = { ...newTransfer("cab"), cost: 800 };
  const ferry = { ...newTransfer("ferry"), cost: 150 };

  it("adds a cost line per transfer: one price for the group, or per person", () => {
    const t = tripWith([place("Airport"), place("Hotel", cab), place("Island", ferry)]);
    const lines = summarize(t).lines.filter((l) => l.item.category === "transfers");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ quantity: 1, total: 800 });
    expect(lines[0].item).toMatchObject({ label: "Cab: Airport to Hotel", icon: "car", link: { day: 1, place: 1, transfer: true } });
    expect(lines[0].item.note).toBe("Day 1 · one price for the group");
    expect(lines[1]).toMatchObject({ quantity: 4, total: 600 });
    expect(lines[1].item).toMatchObject({ label: "Ferry or boat: Hotel to Island", icon: "ship" });
    expect(lines[1].item.note).toBe("Day 1 · per person · 4 people");
    expect(summarize(t).categoryTotals.transfers).toBe(1400);
  });

  it("uses a custom start and a custom number of people", () => {
    const t = tripWith([place("Beach", { ...ferry, from: "Jetty 2", people: 3 })]);
    const [line] = itineraryItems(t.itinerary, t.config);
    expect(line.label).toBe("Ferry or boat: Jetty 2 to Beach");
    expect(line.count).toBe(3);
  });

  it("removing a transfer or its place removes the cost", () => {
    const t = tripWith([place("Airport"), place("Hotel", cab)]);
    expect(summarize(t).categoryTotals.transfers).toBe(800);
    t.itinerary[0].places[1].transferIn = null;
    expect(summarize(t).categoryTotals.transfers).toBeUndefined();
    t.itinerary[0].places[1].transferIn = cab;
    t.itinerary[0].places.pop();
    expect(summarize(t).categoryTotals.transfers).toBeUndefined();
  });

  it("edits the cost through its link and totals a day", () => {
    const t = tripWith([place("Airport", null, 100), place("Hotel", cab)]);
    const next = withLinkedPrice(t.itinerary, { day: 1, place: 1, transfer: true }, 900);
    expect(next[0].places[1].transferIn?.cost).toBe(900);
    expect(next[0].places[0].fee).toBe(100); // the entry fee is untouched
    expect(dayCost(t.itinerary, t.config, 1)).toBe(400 + 800); // 4 x 100 entry + cab
    expect(dayCost(t.itinerary, t.config, 2)).toBe(0);
  });
});
