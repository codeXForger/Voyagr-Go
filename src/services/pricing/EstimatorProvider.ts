import type { CategoryId } from "@/domain/types";
import { convertFromInr, findDestination } from "./destinations";
import type { PriceProvider, PriceQuery, PriceQuote } from "./PriceProvider";

/** Categories with built-in rates. Transfers, parking, places and activities are priced by the user in the itinerary. */
const CATEGORY_KEYS: Exclude<CategoryId, "transfers" | "parking">[] = [
  "flight", "stay", "extraBed", "cab", "breakfast", "lunch", "dinner", "places", "activities",
];
/** Fallback rates (INR) for destinations missing from the catalog. */
const GENERIC_INR = { flight: 15000, stay: 5000, extraBed: 1500, cab: 3500, breakfast: 400, lunch: 600, dinner: 900, places: 800, activities: 2500 };

/** Offline, deterministic estimates from the bundled destination catalog. */
export class EstimatorProvider implements PriceProvider {
  readonly name = "estimate";

  async getPrices(query: PriceQuery): Promise<PriceQuote[]> {
    const dest = findDestination(query.destination);
    const rates = dest ?? GENERIC_INR;
    return CATEGORY_KEYS.map((category) => ({
      category,
      unitPrice: convertFromInr(rates[category], query.currency),
      source: dest ? this.name : `${this.name} (generic)`,
    }));
  }
}
