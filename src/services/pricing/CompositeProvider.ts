import type { PriceProvider, PriceQuery, PriceQuote } from "./PriceProvider";

/**
 * Tries providers in priority order. A failing provider is skipped, and each
 * category keeps the quote from the highest-priority provider that has one.
 */
export class CompositeProvider implements PriceProvider {
  readonly name = "composite";
  constructor(private readonly providers: PriceProvider[]) {}

  async getPrices(query: PriceQuery): Promise<PriceQuote[]> {
    const results = await Promise.all(
      this.providers.map((p) => p.getPrices(query).catch(() => [] as PriceQuote[])),
    );
    const merged = new Map<string, PriceQuote>();
    for (const quotes of results) {
      for (const q of quotes) if (!merged.has(q.category)) merged.set(q.category, q);
    }
    return [...merged.values()];
  }
}
