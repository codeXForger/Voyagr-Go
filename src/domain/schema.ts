import { z } from "zod";
import type { Trip } from "./types";

const category = z.enum(["flight", "stay", "extraBed", "cab", "breakfast", "lunch", "dinner", "places", "activities", "transfers"]);
const basis = z.enum(["perPerson", "perVehicleDay", "perPersonDay", "perPersonNight", "flat"]);

/** Older files stored places as strings plus a day-level activities list; convert them to the nested shape. */
const legacyActivity = (a: unknown) => (typeof a === "string" ? { name: a, people: null, price: 0 } : a);

function migratePlace(p: unknown): unknown {
  if (typeof p === "string") return { name: p, people: null, fee: 0, activities: [] };
  if (!p || typeof p !== "object") return p;
  const o = p as { people?: unknown; fee?: unknown; activities?: unknown };
  return {
    ...o,
    people: o.people ?? null,
    fee: o.fee ?? 0,
    activities: Array.isArray(o.activities) ? o.activities.map(legacyActivity) : o.activities,
  };
}

function migrateDay(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const { activities: legacy, ...rest } = value as Record<string, unknown>;
  const places = Array.isArray(rest.places) ? rest.places.map(migratePlace) : rest.places;
  const loose = Array.isArray(legacy) ? legacy.filter((a) => typeof a === "string" && a.trim()) : [];
  if (loose.length && Array.isArray(places)) {
    places.push({ name: "General activities", people: null, fee: 0, activities: loose.map(legacyActivity) });
  }
  return { ...rest, places };
}

const time = z.string().regex(/^(\d{2}:\d{2})?$/).default("");

const transferSchema = z.object({
  mode: z.enum(["cab", "auto", "bus", "train", "ferry", "flight", "walk", "other"]),
  from: z.string(),
  cost: z.number().min(0),
  billing: z.enum(["group", "perPerson"]),
  people: z.number().int().min(0).nullable(),
  time,
});

const activitySchema = z.object({
  name: z.string(),
  time,
  people: z.number().int().min(0).nullable(),
  price: z.number().min(0),
});

const dayPlan = z.preprocess(
  migrateDay,
  z.object({
    day: z.number().int(),
    title: z.string(),
    places: z.array(
      z.object({
        name: z.string(),
        time,
        transferIn: transferSchema.nullable().default(null),
        people: z.number().int().min(0).nullable(),
        fee: z.number().min(0),
        parking: z.number().min(0).default(0),
        activities: z.array(activitySchema),
      }),
    ),
    notes: z.string(),
  }),
);

const staySchema = z.object({
  id: z.string(),
  name: z.string(),
  checkIn: z.number().int().min(1),
  nights: z.number().int().min(1),
  roomPrice: z.number().min(0),
  rooms: z.number().int().min(1).nullable(),
  guestsPerRoom: z.number().int().min(1),
  extraBeds: z.number().int().min(0),
  extraBedPrice: z.number().min(0),
});

export const tripSchema = z.object({
  id: z.string(),
  name: z.string(),
  config: z.object({
    origin: z.string(),
    destination: z.string(),
    startDate: z.string().default(""),
    currency: z.string(),
    days: z.number().int().min(1),
    nights: z.number().int().min(0),
    people: z.number().int().min(1),
    roomOccupancy: z.number().int().min(1),
    vehicleCapacity: z.number().int().min(1),
  }),
  items: z.array(
    z.object({
      id: z.string(),
      category,
      label: z.string(),
      unitPrice: z.number().min(0),
      basis,
      count: z.number().min(0),
      overridden: z.boolean(),
    }),
  ),
  itinerary: z.array(dayPlan),
  stays: z.array(staySchema).default([]),
});

/**
 * Older files kept one hotel as a "stay" cost row plus config.rooms / config.extraBeds. Turn that into a single
 * hotel stay covering every night, and drop the old rows (they are derived from stays now).
 */
function migrateTrip(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const v = value as { stays?: unknown; items?: unknown; config?: Record<string, unknown> };
  if (v.stays !== undefined || !Array.isArray(v.items)) return value;
  const items = v.items as { category?: string; unitPrice?: number; label?: string }[];
  const oldStay = items.find((i) => i.category === "stay");
  const oldBed = items.find((i) => i.category === "extraBed");
  const kept = items.filter((i) => i.category !== "stay" && i.category !== "extraBed");
  const cfg = v.config ?? {};
  const nights = typeof cfg.nights === "number" ? cfg.nights : 0;
  const stays =
    oldStay && nights > 0
      ? [{
          id: "stay-migrated",
          name: "Hotel",
          checkIn: 1,
          nights,
          roomPrice: oldStay.unitPrice ?? 0,
          rooms: typeof cfg.rooms === "number" ? cfg.rooms : null,
          guestsPerRoom: typeof cfg.roomOccupancy === "number" ? cfg.roomOccupancy : 2,
          extraBeds: typeof cfg.extraBeds === "number" ? cfg.extraBeds : 0,
          extraBedPrice: oldBed?.unitPrice ?? 0,
        }]
      : [];
  return { ...v, items: kept, stays };
}

export function parseTrip(json: unknown): Trip {
  return tripSchema.parse(migrateTrip(json));
}
