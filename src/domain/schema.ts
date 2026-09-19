import { z } from "zod";
import type { Trip } from "./types";

const category = z.enum(["flight", "stay", "extraBed", "cab", "breakfast", "lunch", "dinner", "places", "activities"]);
const basis = z.enum(["perPerson", "perRoomNight", "perExtraBedNight", "perVehicleDay", "perPersonDay", "perPersonNight", "flat"]);

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

const activitySchema = z.object({
  name: z.string(),
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
        people: z.number().int().min(0).nullable(),
        fee: z.number().min(0),
        activities: z.array(activitySchema),
      }),
    ),
    notes: z.string(),
  }),
);

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
    rooms: z.number().int().min(1),
    extraBeds: z.number().int().min(0),
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
});

export function parseTrip(json: unknown): Trip {
  return tripSchema.parse(json);
}
