import { itineraryItems } from "./itineraryCosts";
import { getStrategy } from "./strategies";
import type { CategoryId, DayPlan, LineCost, ScenarioRow, Trip, TripConfig, TripSummary } from "./types";

/** What the calculator needs. The itinerary is optional; its places and activities add cost lines. */
export type CostableTrip = Pick<Trip, "config" | "items"> & { itinerary?: DayPlan[] };

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineCost(config: TripConfig, item: Trip["items"][number]): LineCost {
  const quantity = getStrategy(item.basis).quantity(config, item);
  const unitPrice = Math.max(0, item.unitPrice);
  const total = round2(quantity * unitPrice);
  const perPerson = config.people > 0 ? round2(total / config.people) : 0;
  return { item, quantity, unitPrice, total, perPerson };
}

export function summarize(trip: CostableTrip): TripSummary {
  const all = [...trip.items, ...itineraryItems(trip.itinerary ?? [], trip.config)];
  const lines = all.map((i) => lineCost(trip.config, i));
  const categoryTotals: Partial<Record<CategoryId, number>> = {};
  for (const l of lines) {
    categoryTotals[l.item.category] = round2((categoryTotals[l.item.category] ?? 0) + l.total);
  }
  const grandTotal = round2(lines.reduce((s, l) => s + l.total, 0));
  const perPerson = trip.config.people > 0 ? round2(grandTotal / trip.config.people) : 0;
  return { lines, categoryTotals, grandTotal, perPerson };
}

/** Config for a hypothetical group of `people`: rooms scale, extra beds reset. */
export function scenarioConfig(config: TripConfig, people: number): TripConfig {
  const rooms = Math.max(1, Math.ceil(people / Math.max(1, config.roomOccupancy)));
  return { ...config, people, rooms, extraBeds: 0 };
}

/** Totals for groups of 1..maxPeople so the user can see "if N people go". */
export function scenarioTable(trip: CostableTrip, maxPeople: number): ScenarioRow[] {
  const rows: ScenarioRow[] = [];
  for (let n = 1; n <= maxPeople; n++) {
    const cfg = scenarioConfig(trip.config, n);
    const { grandTotal, perPerson } = summarize({ config: cfg, items: trip.items, itinerary: trip.itinerary });
    rows.push({ people: n, rooms: cfg.rooms, total: grandTotal, perPerson });
  }
  return rows;
}
