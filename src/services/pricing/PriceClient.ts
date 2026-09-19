import type { PriceQuery, PriceQuote } from "./PriceProvider";

/** Browser-side gateway to the /api/prices facade. */
export interface PriceClient {
  fetchQuotes(query: PriceQuery): Promise<PriceQuote[]>;
}

export class HttpPriceClient implements PriceClient {
  async fetchQuotes(query: PriceQuery): Promise<PriceQuote[]> {
    const res = await fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    if (!res.ok) throw new Error("Could not fetch price estimates");
    return (await res.json()).quotes;
  }
}
