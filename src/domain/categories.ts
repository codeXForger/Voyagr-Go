import type { CategoryId, PricingBasis } from "./types";

export type IconKey =
  | "plane"
  | "hotel"
  | "bed"
  | "car"
  | "coffee"
  | "utensils"
  | "moon"
  | "landmark"
  | "ticket";

/** "daily" costs recur every day/night of the stay; "trip" costs are paid once. */
export type CostSection = "daily" | "trip";

export interface CategoryDef {
  id: CategoryId;
  section: CostSection;
  label: string;
  /** Derived from the itinerary (places and activities) instead of being added by hand. */
  linked?: boolean;
  icon: IconKey;
  defaultBasis: PricingBasis;
  defaultLabel: string;
  /** Unit label shown in the table, e.g. "per person". */
  unitLabel: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "flight", section: "trip", label: "Flights", icon: "plane", defaultBasis: "perPerson", defaultLabel: "Round-trip flight", unitLabel: "per person" },
  { id: "stay", section: "daily", label: "Stay", icon: "hotel", defaultBasis: "perRoomNight", defaultLabel: "Hotel room", unitLabel: "per room / night" },
  { id: "extraBed", section: "daily", label: "Extra bed", icon: "bed", defaultBasis: "perExtraBedNight", defaultLabel: "Extra bed", unitLabel: "per bed / night" },
  { id: "cab", section: "daily", label: "Cab", icon: "car", defaultBasis: "perVehicleDay", defaultLabel: "Cab with driver", unitLabel: "per cab / day" },
  { id: "breakfast", section: "daily", label: "Breakfast", icon: "coffee", defaultBasis: "perPersonNight", defaultLabel: "Breakfast", unitLabel: "per person / night" },
  { id: "lunch", section: "daily", label: "Lunch", icon: "utensils", defaultBasis: "perPersonDay", defaultLabel: "Lunch", unitLabel: "per person / day" },
  { id: "dinner", section: "daily", label: "Dinner", icon: "moon", defaultBasis: "perPersonDay", defaultLabel: "Dinner", unitLabel: "per person / day" },
  { id: "places", section: "trip", linked: true, label: "Places to visit", icon: "landmark", defaultBasis: "perPerson", defaultLabel: "Entry tickets", unitLabel: "per person" },
  { id: "activities", section: "trip", linked: true, label: "Activities", icon: "ticket", defaultBasis: "perPerson", defaultLabel: "Activity", unitLabel: "per person" },
];

export const getCategory = (id: CategoryId): CategoryDef => {
  const c = CATEGORIES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown category ${id}`);
  return c;
};

export const SECTIONS: { id: CostSection; title: string; description: string }[] = [
  { id: "daily", title: "Daily charges", description: "Stay, extra beds, meals and cab. Charged for every day or night of the trip." },
  { id: "trip", title: "Trip charges", description: "Paid once for the whole trip: flights, places and activities." },
];
