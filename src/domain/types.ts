export type CategoryId =
  | "flight"
  | "stay"
  | "extraBed"
  | "cab"
  | "breakfast"
  | "lunch"
  | "dinner"
  | "places"
  | "activities";

/** How an item's quantity is derived from the trip configuration. */
export type PricingBasis =
  | "perPerson"
  | "perRoomNight"
  | "perExtraBedNight"
  | "perVehicleDay"
  | "perPersonDay"
  | "perPersonNight"
  | "flat";

export interface TripConfig {
  origin: string;
  destination: string;
  /** Trip start as YYYY-MM-DD, or "" when not chosen. The end date is start + nights. */
  startDate: string;
  currency: string;
  days: number;
  nights: number;
  people: number;
  rooms: number;
  extraBeds: number;
  /** Guests a room holds before an extra bed is needed (used by scenarios). */
  roomOccupancy: number;
  /** Passengers one cab carries (used to scale cab cost with group size). */
  vehicleCapacity: number;
}

/** Points a derived cost line back to the itinerary entry that owns it. */
export interface ItemLink {
  day: number;
  place: number;
  /** Absent for the place's own entry fee. */
  activity?: number;
}

export interface CostItem {
  id: string;
  category: CategoryId;
  label: string;
  /** Price of one unit; the unit depends on `basis`. */
  unitPrice: number;
  basis: PricingBasis;
  /** Extra multiplier (e.g. number of places visited per person). */
  count: number;
  /** True once the user edited the price; providers must not overwrite it. */
  overridden: boolean;
  /** Set only on lines derived from the itinerary (never stored); they are managed there. */
  link?: ItemLink;
  /** Extra context for derived lines, e.g. "Day 1 · at Fort Aguada". */
  note?: string;
}

export interface ActivityStop {
  name: string;
  /** Number of people doing it; null means "everyone going to this place". */
  people: number | null;
  /** Price per person. */
  price: number;
}

/** A place to visit; the activities to do there are its children. */
export interface PlaceStop {
  name: string;
  /** Number of people visiting; null means "everyone on the trip". */
  people: number | null;
  /** Entry fee per person. */
  fee: number;
  activities: ActivityStop[];
}

export interface DayPlan {
  day: number;
  title: string;
  places: PlaceStop[];
  notes: string;
}

export interface Trip {
  id: string;
  name: string;
  config: TripConfig;
  items: CostItem[];
  itinerary: DayPlan[];
}

export interface LineCost {
  item: CostItem;
  quantity: number;
  unitPrice: number;
  total: number;
  perPerson: number;
}

export interface TripSummary {
  lines: LineCost[];
  categoryTotals: Partial<Record<CategoryId, number>>;
  grandTotal: number;
  perPerson: number;
}

export interface ScenarioRow {
  people: number;
  rooms: number;
  total: number;
  perPerson: number;
}
