import type { CategoryId } from "@/domain/types";

export interface PriceQuery {
  origin: string;
  destination: string;
  currency: string;
  /** YYYY-MM-DD; live providers search from this date when it is in the future. */
  startDate?: string;
  days: number;
  nights: number;
  people: number;
}

export interface PriceQuote {
  category: CategoryId;
  /** Unit price in the query currency (unit depends on the category's basis). */
  unitPrice: number;
  source: string;
}

/** Any source of approximate prices (offline estimator, live API, ...). */
export interface PriceProvider {
  readonly name: string;
  getPrices(query: PriceQuery): Promise<PriceQuote[]>;
}
