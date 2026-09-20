export type IconKey =
  | "plane" | "hotel" | "bed" | "car" | "coffee" | "utensils" | "moon" | "landmark" | "ticket"
  | "ship" | "bus" | "train" | "walk" | "route" | "bike" | "clock" | "parking";

export type CategoryId =
  | "flight"
  | "stay"
  | "extraBed"
  | "cab"
  | "breakfast"
  | "lunch"
  | "dinner"
  | "places"
  | "activities"
  | "transfers"
  | "parking";

/** How an item's quantity is derived from the trip configuration. */
export type PricingBasis =
  | "perPerson"
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
  /** Default guests per room for new hotel stays (each stay can change it). */
  roomOccupancy: number;
  /** Passengers one cab carries (used to scale cab cost with group size). */
  vehicleCapacity: number;
}

/** Points a derived cost line back to the itinerary entry that owns it. */
export interface ItemLink {
  day: number;
  place: number;
  /** Set for an activity at that place. */
  activity?: number;
  /** True for the transfer used to reach that place. */
  transfer?: boolean;
  /** True for the place's parking charge. With none of `activity`, `transfer` or `parking`, it is the entry fee. */
  parking?: boolean;
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
  /** Extra context for derived lines, e.g. "Day 1 · at Fort Aguada · per person · 4 people". */
  note?: string;
  /** Icon override for derived lines (e.g. the transfer mode). */
  icon?: IconKey;
  /** Set on lines derived from a hotel stay; they are managed in the itinerary. */
  stay?: { id: string; part: "room" | "bed" };
}

/** A hotel and the run of nights spent there. A trip can have several, one after another. */
export interface Stay {
  id: string;
  name: string;
  /** Day you check in (1-based). You sleep there the night of this day. */
  checkIn: number;
  /** Number of nights. You check out on day `checkIn + nights`. */
  nights: number;
  /** Price per room per night. */
  roomPrice: number;
  /** Rooms booked; null means as many as needed for everyone (people / guestsPerRoom, rounded up). */
  rooms: number | null;
  guestsPerRoom: number;
  extraBeds: number;
  /** Price per extra bed per night. */
  extraBedPrice: number;
}

export type TransferMode = "cab" | "auto" | "bus" | "train" | "ferry" | "flight" | "walk" | "other";

/** How the group gets to a place from the previous stop, with its cost. */
export interface Transfer {
  mode: TransferMode;
  /** Where it starts. Blank means the previous place in the day. */
  from: string;
  cost: number;
  /** "group": one price for everyone (a cab). "perPerson": each traveler pays (a ferry ticket). */
  billing: "group" | "perPerson";
  /** People traveling when billed per person; null means everyone on the trip. */
  people: number | null;
  /** Optional departure time, HH:MM. */
  time: string;
}

export interface ActivityStop {
  name: string;
  /** Optional start time, HH:MM. */
  time?: string;
  /** Number of people doing it; null means "everyone going to this place". */
  people: number | null;
  /** Price per person. */
  price: number;
}

/** A place to visit; the activities to do there are its children. */
export interface PlaceStop {
  name: string;
  /** Optional arrival time, HH:MM. */
  time?: string;
  /** How you get here from the previous stop. */
  transferIn?: Transfer | null;
  /** Number of people visiting; null means "everyone on the trip". */
  people: number | null;
  /** Entry fee per person. */
  fee: number;
  /** Optional parking charge for the whole group at this place (0 = none). */
  parking?: number;
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
  stays: Stay[];
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
