import { newId } from "./trip";
import type { CostItem, Stay, TripConfig } from "./types";

const clampInt = (n: number, min: number) => Math.max(min, Math.floor(Number.isFinite(n) ? n : min));

/** Nights of this stay that fall inside the trip (a stay can outlive a trip that was shortened). */
export const stayNights = (stay: Stay, config: Pick<TripConfig, "nights">) =>
  Math.max(0, Math.min(stay.nights, config.nights - (stay.checkIn - 1)));

export const stayCheckOut = (stay: Stay) => stay.checkIn + stay.nights;

/** Rooms booked: what the user set, else enough rooms for everyone. */
export const stayRooms = (stay: Stay, config: Pick<TripConfig, "people">) =>
  stay.rooms ?? Math.max(1, Math.ceil(config.people / Math.max(1, stay.guestsPerRoom)));

const nightsText = (n: number) => `${n} ${n === 1 ? "night" : "nights"}`;

/** "Day 1 to Day 3 (2 nights)" */
export const stayRangeText = (stay: Stay, config: Pick<TripConfig, "nights">) =>
  `Day ${stay.checkIn} to Day ${stay.checkIn + stayNights(stay, config)} (${nightsText(stayNights(stay, config))})`;

/**
 * Cost lines for hotels: one for the rooms and, when there are extra beds, one for those.
 * Derived from the stays (never stored), so removing a stay removes its costs.
 */
export function stayItems(stays: Stay[], config: TripConfig): CostItem[] {
  const items: CostItem[] = [];
  for (const s of stays) {
    const n = stayNights(s, config);
    if (n === 0) continue;
    const name = s.name.trim() || "Hotel";
    const rooms = stayRooms(s, config);
    const range = `Day ${s.checkIn} to ${s.checkIn + n}`;
    items.push({
      id: `stay-${s.id}-room`,
      category: "stay",
      label: `${name}: ${rooms === 1 ? "room" : "rooms"}`,
      unitPrice: s.roomPrice,
      basis: "flat",
      count: rooms * n,
      overridden: false,
      stay: { id: s.id, part: "room" },
      note: `${range} · ${rooms} ${rooms === 1 ? "room" : "rooms"} × ${nightsText(n)} · ${s.guestsPerRoom} per room`,
    });
    if (s.extraBeds > 0) {
      items.push({
        id: `stay-${s.id}-bed`,
        category: "extraBed",
        label: `${name}: extra ${s.extraBeds === 1 ? "bed" : "beds"}`,
        unitPrice: s.extraBedPrice,
        basis: "flat",
        count: s.extraBeds * n,
        overridden: false,
        stay: { id: s.id, part: "bed" },
        note: `${range} · ${s.extraBeds} ${s.extraBeds === 1 ? "bed" : "beds"} × ${nightsText(n)}`,
      });
    }
  }
  return items;
}

/** The stay(s) you sleep at on the night of `day` (usually one). */
export const staysOnNight = (stays: Stay[], day: number): Stay[] =>
  stays.filter((s) => day >= s.checkIn && day < s.checkIn + s.nights);

/** Nights (as day numbers 1..nights) that no hotel covers. */
export function uncoveredNights(stays: Stay[], config: Pick<TripConfig, "nights">): number[] {
  const out: number[] = [];
  for (let day = 1; day <= config.nights; day++) if (staysOnNight(stays, day).length === 0) out.push(day);
  return out;
}

/** Groups consecutive night numbers into runs, e.g. [1,2,4] becomes [{start:1,length:2},{start:4,length:1}]. */
export function runsOf(nights: number[]): { start: number; length: number }[] {
  const runs: { start: number; length: number }[] = [];
  for (const n of nights) {
    const last = runs[runs.length - 1];
    if (last && last.start + last.length === n) last.length++;
    else runs.push({ start: n, length: 1 });
  }
  return runs;
}

/** A new hotel placed in the first stretch of nights that has no hotel yet. */
export function newStay(stays: Stay[], config: TripConfig): Stay {
  const run = runsOf(uncoveredNights(stays, config))[0] ?? { start: 1, length: Math.min(1, config.nights) || 1 };
  return {
    id: newId("stay"),
    name: `Hotel ${stays.length + 1}`,
    checkIn: run.start,
    nights: run.length,
    roomPrice: 0,
    rooms: null,
    guestsPerRoom: config.roomOccupancy,
    extraBeds: 0,
    extraBedPrice: 0,
  };
}

/** Keeps edits sensible: whole numbers, check-in inside the trip, at least one night. */
export function normalizeStay(stay: Stay, config: Pick<TripConfig, "days">): Stay {
  const checkIn = Math.min(clampInt(stay.checkIn, 1), Math.max(1, config.days - 1));
  return {
    ...stay,
    checkIn,
    nights: clampInt(stay.nights, 1),
    guestsPerRoom: clampInt(stay.guestsPerRoom, 1),
    rooms: stay.rooms === null ? null : clampInt(stay.rooms, 1),
    extraBeds: clampInt(stay.extraBeds, 0),
    roomPrice: Math.max(0, Number.isFinite(stay.roomPrice) ? stay.roomPrice : 0),
    extraBedPrice: Math.max(0, Number.isFinite(stay.extraBedPrice) ? stay.extraBedPrice : 0),
  };
}

/** Most rooms booked in any one hotel (0 with no hotels); shown in summaries. */
export const maxRooms = (stays: Stay[], config: TripConfig) =>
  stays.reduce((m, s) => Math.max(m, stayNights(s, config) > 0 ? stayRooms(s, config) : 0), 0);

export interface LodgingNote {
  kind: "checkout" | "checkin" | "stay" | "none";
  stay?: Stay;
}

/** What is happening with your hotel on a day: leaving one, arriving at one, sleeping in one, or no hotel yet. */
export function lodgingNotes(stays: Stay[], config: Pick<TripConfig, "nights">, day: number): LodgingNote[] {
  const notes: LodgingNote[] = [];
  for (const s of stays) if (stayCheckOut(s) === day && stayNights(s, config) > 0) notes.push({ kind: "checkout", stay: s });
  const sleeping = staysOnNight(stays, day).filter((s) => day <= config.nights);
  for (const s of sleeping) notes.push({ kind: s.checkIn === day ? "checkin" : "stay", stay: s });
  if (day <= config.nights && sleeping.length === 0) notes.push({ kind: "none" });
  return notes;
}

/** Other hotels that share at least one night with this one. */
export const overlappingStays = (stays: Stay[], stay: Stay): Stay[] =>
  stays.filter((o) => o.id !== stay.id && o.checkIn < stay.checkIn + stay.nights && stay.checkIn < o.checkIn + o.nights);

/** Total for one hotel: rooms and extra beds over its nights. */
export function stayTotal(stay: Stay, config: TripConfig): { rooms: number; beds: number; total: number } {
  const n = stayNights(stay, config);
  const rooms = Math.round(stayRooms(stay, config) * n * stay.roomPrice * 100) / 100;
  const beds = Math.round(stay.extraBeds * n * stay.extraBedPrice * 100) / 100;
  return { rooms, beds, total: Math.round((rooms + beds) * 100) / 100 };
}

/** Hotel names for suggestions, in check-in order, without blanks or repeats. */
export function hotelNames(stays: Stay[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...stays].sort((a, b) => a.checkIn - b.checkIn)) {
    const name = s.name.trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      out.push(name);
    }
  }
  return out;
}

/** True when a stop or transfer start is one of your hotels (matched by name, ignoring case). */
export const isHotelName = (stays: Stay[], name: string) =>
  hotelNames(stays).some((h) => h.toLowerCase() === name.trim().toLowerCase());
