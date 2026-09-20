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
      { name: "Fort", time: "", transferIn: null, people: null, fee: 0, parking: 0, activities: [] },
      { name: "Beach", time: "", transferIn: null, people: null, fee: 0, parking: 0, activities: [] },
      { name: "General activities", time: "", transferIn: null, people: null, fee: 0, parking: 0, activities: [{ name: "Cruise", time: "", people: null, price: 0 }] },
    ]);
  });
  it("migrates the previous nested shape (activities as strings)", () => {
    const t = createTrip({ days: 1, nights: 0 });
    const old = JSON.parse(JSON.stringify(t));
    old.itinerary = [{ day: 1, title: "Day 1", places: [{ name: "Fort", activities: ["Tour"] }], notes: "" }];
    expect(parseTrip(old).itinerary[0].places[0]).toEqual({
      name: "Fort", time: "", transferIn: null, people: null, fee: 0, parking: 0, activities: [{ name: "Tour", time: "", people: null, price: 0 }],
    });
  });
  it("keeps transfers and times, and rejects a malformed time", () => {
    const t = createTrip({ days: 1, nights: 0 });
    t.itinerary[0].places = [{
      name: "Hotel", time: "09:30", people: null, fee: 0, parking: 0, activities: [],
      transferIn: { mode: "ferry", from: "Jetty", cost: 120, billing: "perPerson", people: 2, time: "08:15" },
    }];
    expect(parseTrip(JSON.parse(JSON.stringify(t))).itinerary[0].places[0]).toEqual(t.itinerary[0].places[0]);
    t.itinerary[0].places[0].time = "9:30am";
    expect(() => parseTrip(JSON.parse(JSON.stringify(t)))).toThrow();
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

describe("hotel stays in saved files", () => {
  it("round-trips hotels", () => {
    const t = createTrip({ days: 3, nights: 2 });
    t.stays = [{ id: "s1", name: "Sea View", checkIn: 1, nights: 2, roomPrice: 3500, rooms: null, guestsPerRoom: 2, extraBeds: 1, extraBedPrice: 900 }];
    expect(parseTrip(JSON.parse(JSON.stringify(t))).stays).toEqual(t.stays);
  });

  it("turns an older file's stay and extra-bed rows into one hotel covering every night", () => {
    const t = createTrip({ days: 4, nights: 3 });
    const old = JSON.parse(JSON.stringify(t));
    delete old.stays;
    old.config.rooms = 2;
    old.config.extraBeds = 1;
    old.items.unshift(
      { id: "s", category: "stay", label: "Hotel room", unitPrice: 3500, basis: "perRoomNight", count: 1, overridden: false },
      { id: "e", category: "extraBed", label: "Extra bed", unitPrice: 900, basis: "perExtraBedNight", count: 1, overridden: false },
    );
    const parsed = parseTrip(old);
    expect(parsed.stays).toEqual([
      { id: "stay-migrated", name: "Hotel", checkIn: 1, nights: 3, roomPrice: 3500, rooms: 2, guestsPerRoom: 2, extraBeds: 1, extraBedPrice: 900 },
    ]);
    expect(parsed.items.some((i) => i.category === "stay" || i.category === "extraBed")).toBe(false);
    expect(parsed.items.map((i) => i.category)).toEqual(["breakfast", "lunch", "dinner"]);
  });

  it("opens files with no hotel row or no nights without inventing a hotel", () => {
    const t = createTrip({ days: 1, nights: 0 });
    const old = JSON.parse(JSON.stringify(t));
    delete old.stays;
    expect(parseTrip(old).stays).toEqual([]);
  });

  it("rejects a hotel with no nights", () => {
    const t = createTrip({ days: 3, nights: 2 });
    t.stays = [{ id: "s", name: "X", checkIn: 1, nights: 0, roomPrice: 0, rooms: null, guestsPerRoom: 2, extraBeds: 0, extraBedPrice: 0 }];
    expect(() => parseTrip(JSON.parse(JSON.stringify(t)))).toThrow();
  });
});
