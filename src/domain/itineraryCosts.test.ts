import { describe, expect, it } from "vitest";
import { activityPeople, dayCost, itineraryItems, placePeople, withLinkedPrice } from "./itineraryCosts";
import { scenarioTable, summarize } from "./pricing";
import { createTrip, DEFAULT_ACTIVITY_PRICE, newActivity, newPlace } from "./trip";
import type { Trip } from "./types";

const tripWith = (places: Trip["itinerary"][number]["places"], people = 4): Trip => {
  const t = createTrip({ people, days: 2, nights: 1 });
  t.itinerary[0].places = places;
  return t;
};

describe("itinerary-derived costs", () => {
  it("has no place or activity lines by default", () => {
    const t = createTrip();
    expect(t.items.some((i) => i.category === "places" || i.category === "activities")).toBe(false);
    expect(summarize(t).lines.some((l) => l.item.link)).toBe(false);
  });

  it("uses sensible defaults: place fee 0, place people = trip people, activity price 500, people = place people", () => {
    expect(newPlace()).toMatchObject({ people: null, fee: 0 });
    expect(newActivity()).toMatchObject({ people: null, price: 500 });
    expect(DEFAULT_ACTIVITY_PRICE).toBe(500);
    const place = { ...newPlace(), name: "Fort", people: 3, activities: [newActivity()] };
    const t = tripWith([place]);
    expect(placePeople(newPlace(), t.config)).toBe(4);
    expect(activityPeople(place.activities[0], place, t.config)).toBe(3);
  });

  it("adds a cost line per place and activity, tied to the itinerary", () => {
    const t = tripWith([{ ...newPlace(), name: "Fort", fee: 100, activities: [{ name: "Cruise", people: null, price: 500 }] }]);
    const lines = summarize(t).lines.filter((l) => l.item.link);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ quantity: 4, total: 400 });
    expect(lines[0].item).toMatchObject({ category: "places", link: { day: 1, place: 0 } });
    expect(lines[1]).toMatchObject({ quantity: 4, total: 2000 });
    expect(lines[1].item).toMatchObject({ category: "activities", label: "Cruise", link: { day: 1, place: 0, activity: 0 } });
    expect(summarize(t).categoryTotals).toMatchObject({ places: 400, activities: 2000 });
  });

  it("removing an itinerary row removes its cost line", () => {
    const t = tripWith([{ ...newPlace(), name: "Fort", activities: [newActivity()] }]);
    expect(itineraryItems(t.itinerary, t.config)).toHaveLength(2);
    t.itinerary[0].places[0].activities = [];
    expect(itineraryItems(t.itinerary, t.config)).toHaveLength(1);
    t.itinerary[0].places = [];
    expect(itineraryItems(t.itinerary, t.config)).toHaveLength(0);
  });

  it("charges only the people involved, an explicit number overriding the default", () => {
    const t = tripWith([{ ...newPlace(), name: "Fort", people: 2, activities: [{ name: "Ride", people: 1, price: 300 }, newActivity()] }]);
    const [, ride, other] = summarize(t).lines.filter((l) => l.item.link);
    expect(ride).toMatchObject({ quantity: 1, total: 300 });
    expect(other).toMatchObject({ quantity: 2, total: 1000 }); // follows the place's 2 people
  });

  it("follows the trip's people count while people is left at its default", () => {
    const t = tripWith([{ ...newPlace(), name: "Fort", fee: 50 }]);
    expect(summarize(t).grandTotal).toBe(200);
    t.config.people = 6;
    expect(summarize(t).grandTotal).toBe(300);
  });

  it("feeds the group-size table", () => {
    const t = tripWith([{ ...newPlace(), name: "Fort", fee: 100 }], 2);
    const rows = scenarioTable(t, 3);
    expect(rows.map((r) => r.total)).toEqual([100, 200, 300]);
  });

  it("updates prices through their link", () => {
    const t = tripWith([{ ...newPlace(), name: "Fort", activities: [newActivity()] }]);
    let it2 = withLinkedPrice(t.itinerary, { day: 1, place: 0 }, 75);
    it2 = withLinkedPrice(it2, { day: 1, place: 0, activity: 0 }, 900);
    expect(it2[0].places[0].fee).toBe(75);
    expect(it2[0].places[0].activities[0].price).toBe(900);
    expect(withLinkedPrice(it2, { day: 1, place: 0 }, -5)[0].places[0].fee).toBe(0);
    expect(t.itinerary[0].places[0].fee).toBe(0); // original untouched
  });
});

describe("parking charges", () => {
  it("defaults to 0 and adds no cost line until a price is entered", () => {
    expect(newPlace().parking).toBe(0);
    const t = tripWith([{ ...newPlace(), name: "Fort", fee: 100 }]);
    expect(itineraryItems(t.itinerary, t.config).some((i) => i.category === "parking")).toBe(false);
    expect(summarize(t).categoryTotals.parking).toBeUndefined();
  });

  it("adds one group price per place, tied to that place", () => {
    const t = tripWith([{ ...newPlace(), name: "Fort", fee: 100, parking: 150 }, { ...newPlace(), name: "Beach", parking: 50 }]);
    const lines = summarize(t).lines.filter((l) => l.item.category === "parking");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ quantity: 1, total: 150 }); // not multiplied by the 4 people
    expect(lines[0].item).toMatchObject({ label: "Fort parking", link: { day: 1, place: 0, parking: true } });
    expect(lines[0].item.note).toBe("Day 1 · one price for the group");
    expect(summarize(t).categoryTotals.parking).toBe(200);
  });

  it("goes away when set back to 0 or when the place is removed, and counts in the day's cost", () => {
    const t = tripWith([{ ...newPlace(), name: "Fort", fee: 100, parking: 150 }]);
    expect(dayCost(t.itinerary, t.config, 1)).toBe(400 + 150);
    t.itinerary[0].places[0].parking = 0;
    expect(summarize(t).categoryTotals.parking).toBeUndefined();
    t.itinerary[0].places[0].parking = 150;
    t.itinerary[0].places = [];
    expect(summarize(t).categoryTotals.parking).toBeUndefined();
  });

  it("edits the parking price through its link without touching the entry fee", () => {
    const t = tripWith([{ ...newPlace(), name: "Fort", fee: 100, parking: 150 }]);
    const next = withLinkedPrice(t.itinerary, { day: 1, place: 0, parking: true }, 220);
    expect(next[0].places[0]).toMatchObject({ parking: 220, fee: 100 });
    expect(withLinkedPrice(t.itinerary, { day: 1, place: 0, parking: true }, -1)[0].places[0].parking).toBe(0);
  });
});
