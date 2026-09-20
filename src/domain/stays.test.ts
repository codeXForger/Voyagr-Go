import { describe, expect, it } from "vitest";
import { summarize, scenarioTable } from "./pricing";
import {
  lodgingNotes, maxRooms, newStay, normalizeStay, overlappingStays, runsOf, stayItems, stayNights, stayRangeText,
  stayRooms, stayTotal, uncoveredNights,
} from "./stays";
import { createTrip } from "./trip";
import type { Stay } from "./types";

const stay = (over: Partial<Stay> = {}): Stay => ({
  id: "a", name: "Hotel A", checkIn: 1, nights: 2, roomPrice: 3000, rooms: null, guestsPerRoom: 2, extraBeds: 0, extraBedPrice: 0, ...over,
});
const config = { ...createTrip().config, people: 4, days: 5, nights: 4 };

describe("stay rooms and nights", () => {
  it("books enough rooms for everyone unless set", () => {
    expect(stayRooms(stay(), config)).toBe(2); // 4 people, 2 per room
    expect(stayRooms(stay({ guestsPerRoom: 3 }), config)).toBe(2);
    expect(stayRooms(stay({ guestsPerRoom: 4 }), config)).toBe(1);
    expect(stayRooms(stay({ rooms: 3 }), config)).toBe(3);
    expect(stayRooms(stay(), { people: 1 })).toBe(1);
  });
  it("only counts nights inside the trip", () => {
    expect(stayNights(stay({ checkIn: 3, nights: 5 }), config)).toBe(2); // trip has 4 nights: 3 and 4
    expect(stayNights(stay({ checkIn: 9 }), config)).toBe(0);
    expect(stayRangeText(stay(), config)).toBe("Day 1 to Day 3 (2 nights)");
  });
});

describe("stay costs", () => {
  it("adds a room line, and an extra-bed line only when there are extra beds", () => {
    const items = stayItems([stay()], config);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ category: "stay", unitPrice: 3000, count: 4, stay: { id: "a", part: "room" } }); // 2 rooms x 2 nights
    expect(items[0].label).toBe("Hotel A: rooms");
    expect(items[0].note).toBe("Day 1 to 3 · 2 rooms × 2 nights · 2 per room");

    const withBed = stayItems([stay({ extraBeds: 1, extraBedPrice: 800 })], config);
    expect(withBed[1]).toMatchObject({ category: "extraBed", unitPrice: 800, count: 2, stay: { part: "bed" } });
  });

  it("charges each hotel for its own nights, so one trip can have several", () => {
    const stays = [stay(), stay({ id: "b", name: "Hotel B", checkIn: 3, nights: 1, roomPrice: 5000, guestsPerRoom: 4 })];
    const trip = { ...createTrip({ people: 4, days: 5, nights: 4 }), stays };
    const s = summarize(trip);
    expect(s.categoryTotals.stay).toBe(2 * 2 * 3000 + 1 * 1 * 5000); // A: 2 rooms x 2 nights, B: 1 room x 1 night
    expect(stayTotal(stays[1], trip.config).total).toBe(5000);
  });

  it("removing a hotel removes its costs; zero nights inside the trip costs nothing", () => {
    const trip = { ...createTrip({ people: 2, days: 3, nights: 2 }), stays: [stay({ roomPrice: 100 })] };
    expect(summarize(trip).categoryTotals.stay).toBe(200);
    expect(summarize({ ...trip, stays: [] }).categoryTotals.stay).toBeUndefined();
    expect(stayItems([stay({ checkIn: 8 })], trip.config)).toEqual([]);
  });

  it("scales rooms in the group-size table when rooms are automatic", () => {
    const trip = { ...createTrip({ people: 2, days: 2, nights: 1 }), stays: [stay({ nights: 1, roomPrice: 500 })] };
    const rows = scenarioTable(trip, 5);
    expect(rows.map((r) => r.rooms)).toEqual([1, 1, 2, 2, 3]);
    expect(rows.map((r) => r.total)).toEqual([500, 500, 1000, 1000, 1500]);
    const fixed = scenarioTable({ ...trip, stays: [stay({ nights: 1, roomPrice: 500, rooms: 2 })] }, 3);
    expect(fixed.map((r) => r.total)).toEqual([1000, 1000, 1000]);
  });
});

describe("nights coverage", () => {
  it("finds nights with no hotel and groups them into runs", () => {
    const stays = [stay({ checkIn: 2, nights: 1 })];
    expect(uncoveredNights(stays, config)).toEqual([1, 3, 4]);
    expect(runsOf([1, 3, 4])).toEqual([{ start: 1, length: 1 }, { start: 3, length: 2 }]);
    expect(uncoveredNights([stay({ nights: 4 })], config)).toEqual([]);
  });

  it("places a new hotel in the first gap", () => {
    const first = newStay([], config);
    expect(first).toMatchObject({ checkIn: 1, nights: 4, name: "Hotel 1", guestsPerRoom: 2, rooms: null, roomPrice: 0 });
    const second = newStay([stay({ nights: 2 })], config);
    expect(second).toMatchObject({ checkIn: 3, nights: 2, name: "Hotel 2" });
    expect(newStay([stay({ nights: 4 })], config).checkIn).toBe(1); // everything covered: falls back to night 1
  });

  it("flags hotels that share nights", () => {
    const a = stay({ nights: 2 });
    const b = stay({ id: "b", checkIn: 2, nights: 2 });
    const c = stay({ id: "c", checkIn: 3, nights: 1 });
    expect(overlappingStays([a, b, c], a).map((s) => s.id)).toEqual(["b"]);
    expect(overlappingStays([a, c], a)).toEqual([]);
  });

  it("describes what happens with your hotel each day", () => {
    const stays = [stay({ nights: 2 }), stay({ id: "b", name: "Hotel B", checkIn: 3, nights: 1 })];
    const kinds = (d: number) => lodgingNotes(stays, config, d).map((n) => `${n.kind}:${n.stay?.name ?? ""}`);
    expect(kinds(1)).toEqual(["checkin:Hotel A"]);
    expect(kinds(2)).toEqual(["stay:Hotel A"]);
    expect(kinds(3)).toEqual(["checkout:Hotel A", "checkin:Hotel B"]);
    expect(kinds(4)).toEqual(["checkout:Hotel B", "none:"]);
    expect(kinds(5)).toEqual([]);
  });

  it("keeps edits sensible", () => {
    const n = normalizeStay(stay({ checkIn: 99, nights: -2, guestsPerRoom: 0, extraBeds: -1, roomPrice: -5, rooms: 0 }), config);
    expect(n).toMatchObject({ checkIn: 4, nights: 1, guestsPerRoom: 1, extraBeds: 0, roomPrice: 0, rooms: 1 });
    expect(maxRooms([stay(), stay({ id: "b", rooms: 5 })], config)).toBe(5);
    expect(maxRooms([], config)).toBe(0);
  });
});
