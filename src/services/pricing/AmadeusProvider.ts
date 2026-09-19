import { addDays, isIsoDate } from "@/domain/dates";
import { loadAllLocations, toIata } from "@/domain/locations";
import { findDestination } from "./destinations";
import type { PriceProvider, PriceQuery, PriceQuote } from "./PriceProvider";

type Fetch = typeof fetch;
const BASE = "https://test.api.amadeus.com";

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const isoDate = (offsetDays: number) => new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);
/** The trip's start date when it is in the future, otherwise a date a month out. */
const departure = (q: PriceQuery) => (q.startDate && isIsoDate(q.startDate) && q.startDate >= isoDate(0) ? q.startDate : isoDate(30));

/** Live flights + hotels from the Amadeus self-service API (test environment). */
export class AmadeusProvider implements PriceProvider {
  readonly name = "amadeus";
  private token?: string;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly http: Fetch = fetch,
  ) {}

  async getPrices(query: PriceQuery): Promise<PriceQuote[]> {
    await loadAllLocations();
    const iata = findDestination(query.destination)?.iata ?? toIata(query.destination);
    if (!iata) return [];
    const quotes: PriceQuote[] = [];
    const [flight, stay] = await Promise.allSettled([this.flight(query, iata), this.hotel(query, iata)]);
    if (flight.status === "fulfilled" && flight.value > 0)
      quotes.push({ category: "flight", unitPrice: flight.value, source: this.name });
    if (stay.status === "fulfilled" && stay.value > 0)
      quotes.push({ category: "stay", unitPrice: stay.value, source: this.name });
    return quotes;
  }

  private async auth(): Promise<string> {
    if (this.token) return this.token;
    const res = await this.http(`${BASE}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: this.clientId, client_secret: this.clientSecret }),
    });
    if (!res.ok) throw new Error(`Amadeus auth failed: ${res.status}`);
    this.token = (await res.json()).access_token as string;
    return this.token;
  }

  private async get(path: string, params: Record<string, string>) {
    const res = await this.http(`${BASE}${path}?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${await this.auth()}` },
    });
    if (!res.ok) throw new Error(`Amadeus ${path} failed: ${res.status}`);
    return res.json();
  }

  private async flight(q: PriceQuery, iata: string): Promise<number> {
    const origin = toIata(q.origin) || q.origin.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(origin)) return 0; // needs a known place or IATA code as origin
    const depart = departure(q);
    const json = await this.get("/v2/shopping/flight-offers", {
      originLocationCode: origin,
      destinationLocationCode: iata,
      departureDate: depart,
      returnDate: addDays(depart, q.nights),
      adults: "1",
      currencyCode: q.currency,
      max: "10",
    });
    return median((json.data ?? []).map((o: { price: { grandTotal: string } }) => Number(o.price.grandTotal)));
  }

  private async hotel(q: PriceQuery, iata: string): Promise<number> {
    const list = await this.get("/v1/reference-data/locations/hotels/by-city", { cityCode: iata });
    const ids = (list.data ?? []).slice(0, 20).map((h: { hotelId: string }) => h.hotelId);
    if (!ids.length) return 0;
    const json = await this.get("/v3/shopping/hotel-offers", {
      hotelIds: ids.join(","),
      checkInDate: departure(q),
      checkOutDate: addDays(departure(q), Math.max(1, q.nights)),
      adults: "2",
      currency: q.currency,
    });
    const nights = Math.max(1, q.nights);
    const prices = (json.data ?? []).flatMap((h: { offers?: { price: { total: string } }[] }) =>
      (h.offers ?? []).slice(0, 1).map((o) => Number(o.price.total) / nights),
    );
    return Math.round(median(prices));
  }
}
