import type { CategoryId, IconKey, PricingBasis } from "./types";

export type { IconKey };

/** "daily" costs recur every day/night of the stay; "trip" costs are paid once. */
export type CostSection = "daily" | "trip";

export interface CategoryDef {
  id: CategoryId;
  section: CostSection;
  label: string;
  /** Derived from the itinerary (places, activities, transfers) instead of being added by hand. */
  linked?: boolean;
  /** Only kept so older saved trips still open. Never created by default or offered in the Add menu. */
  legacy?: boolean;
  icon: IconKey;
  defaultBasis: PricingBasis;
  defaultLabel: string;
  /** Unit label shown in the table, e.g. "per person". */
  unitLabel: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "flight", section: "trip", legacy: true, label: "Flights", icon: "plane", defaultBasis: "perPerson", defaultLabel: "Round-trip flight", unitLabel: "per person" },
  { id: "stay", section: "daily", linked: true, label: "Stay", icon: "hotel", defaultBasis: "flat", defaultLabel: "Hotel", unitLabel: "per room / night" },
  { id: "extraBed", section: "daily", linked: true, label: "Extra bed", icon: "bed", defaultBasis: "flat", defaultLabel: "Extra bed", unitLabel: "per bed / night" },
  { id: "cab", section: "trip", legacy: true, label: "Cab", icon: "car", defaultBasis: "perVehicleDay", defaultLabel: "Cab with driver", unitLabel: "per cab / day" },
  { id: "breakfast", section: "daily", label: "Breakfast", icon: "coffee", defaultBasis: "perPersonNight", defaultLabel: "Breakfast", unitLabel: "per person / night" },
  { id: "lunch", section: "daily", label: "Lunch", icon: "utensils", defaultBasis: "perPersonDay", defaultLabel: "Lunch", unitLabel: "per person / day" },
  { id: "dinner", section: "daily", label: "Dinner", icon: "moon", defaultBasis: "perPersonDay", defaultLabel: "Dinner", unitLabel: "per person / day" },
  { id: "places", section: "trip", linked: true, label: "Places to visit", icon: "landmark", defaultBasis: "perPerson", defaultLabel: "Entry tickets", unitLabel: "per person" },
  { id: "activities", section: "trip", linked: true, label: "Activities", icon: "ticket", defaultBasis: "perPerson", defaultLabel: "Activity", unitLabel: "per person" },
  { id: "parking", section: "trip", linked: true, label: "Parking", icon: "parking", defaultBasis: "flat", defaultLabel: "Parking", unitLabel: "per stop" },
  { id: "transfers", section: "trip", linked: true, label: "Transfers", icon: "route", defaultBasis: "flat", defaultLabel: "Transfer", unitLabel: "per ride" },
];

export const getCategory = (id: CategoryId): CategoryDef => {
  const c = CATEGORIES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown category ${id}`);
  return c;
};

export const SECTIONS: { id: CostSection; title: string; description: string }[] = [
  { id: "daily", title: "Daily charges", description: "Hotels, extra beds and meals. Charged for every day or night of the trip. Hotels come from the itinerary." },
  { id: "trip", title: "Trip charges", description: "Paid once for the whole trip: entry fees, activities and transfers, including cabs and flights. All of these come from the itinerary." },
];
