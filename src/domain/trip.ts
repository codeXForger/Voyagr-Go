import { CATEGORIES } from "./categories";
import type { ActivityStop, CostItem, DayPlan, PlaceStop, Trip, TripConfig } from "./types";

export const DEFAULT_ACTIVITY_PRICE = 500;

export const newPlace = (): PlaceStop => ({ name: "", people: null, fee: 0, activities: [] });
export const newActivity = (): ActivityStop => ({ name: "", people: null, price: DEFAULT_ACTIVITY_PRICE });

let seq = 0;
export const newId = (prefix = "id") =>
  `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const defaultConfig = (): TripConfig => ({
  origin: "",
  destination: "",
  startDate: "",
  currency: "INR",
  days: 4,
  nights: 3,
  people: 2,
  rooms: 1,
  extraBeds: 0,
  roomOccupancy: 2,
  vehicleCapacity: 4,
});

export const buildItinerary = (days: number, previous: DayPlan[] = []): DayPlan[] =>
  Array.from({ length: Math.max(0, days) }, (_, i) => {
    const day = i + 1;
    return previous[i] ?? { day, title: `Day ${day}`, places: [], notes: "" };
  });

export const defaultItems = (): CostItem[] =>
  CATEGORIES.filter((c) => !c.linked).map((c) => ({
    id: newId(c.id),
    category: c.id,
    label: c.defaultLabel,
    unitPrice: 0,
    basis: c.defaultBasis,
    count: 1,
    overridden: false,
  }));

export function createTrip(overrides: Partial<TripConfig> = {}): Trip {
  const config = { ...defaultConfig(), ...overrides };
  return {
    id: newId("trip"),
    name: config.destination ? `Trip to ${config.destination}` : "New trip",
    config,
    items: defaultItems(),
    itinerary: buildItinerary(config.days),
  };
}

/** Keep days/nights consistent: nights = days - 1 unless caller sets both. */
export function withDays(config: TripConfig, days: number): TripConfig {
  const d = Math.max(1, Math.floor(days) || 1);
  return { ...config, days: d, nights: Math.max(0, d - 1) };
}

export function withNights(config: TripConfig, nights: number): TripConfig {
  const n = Math.max(0, Math.floor(nights) || 0);
  return { ...config, nights: n, days: n + 1 };
}
