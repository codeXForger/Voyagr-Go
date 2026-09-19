import { describe, expect, it, vi } from "vitest";
import { AmadeusProvider } from "./AmadeusProvider";
import { CompositeProvider } from "./CompositeProvider";
import { EstimatorProvider } from "./EstimatorProvider";
import type { PriceProvider, PriceQuery } from "./PriceProvider";
import { createPriceProvider } from "./providerFactory";

const q: PriceQuery = { origin: "DEL", destination: "Goa", currency: "INR", days: 4, nights: 3, people: 2 };

describe("EstimatorProvider", () => {
  it("returns a quote for every category, deterministically", async () => {
    const p = new EstimatorProvider();
    const a = await p.getPrices(q);
    expect(a).toHaveLength(9);
    expect(a).toEqual(await p.getPrices(q));
  });
  it("converts currency and falls back for unknown destinations", async () => {
    const usd = await new EstimatorProvider().getPrices({ ...q, currency: "USD" });
    expect(usd.find((x) => x.category === "flight")!.unitPrice).toBe(78);
    const generic = await new EstimatorProvider().getPrices({ ...q, destination: "Nowhere" });
    expect(generic[0].source).toContain("generic");
  });
});

describe("CompositeProvider", () => {
  const live: PriceProvider = { name: "live", getPrices: async () => [{ category: "flight", unitPrice: 1, source: "live" }] };
  const broken: PriceProvider = { name: "bad", getPrices: async () => { throw new Error("down"); } };

  it("prefers higher-priority quotes and fills gaps", async () => {
    const out = await new CompositeProvider([live, new EstimatorProvider()]).getPrices(q);
    expect(out.find((x) => x.category === "flight")).toMatchObject({ unitPrice: 1, source: "live" });
    expect(out).toHaveLength(9);
  });
  it("survives a failing provider", async () => {
    const out = await new CompositeProvider([broken, new EstimatorProvider()]).getPrices(q);
    expect(out).toHaveLength(9);
  });
});

describe("AmadeusProvider", () => {
  it("maps flight and hotel responses to quotes", async () => {
    const http = vi.fn(async (url: string) => {
      const json = (body: unknown) => ({ ok: true, json: async () => body }) as Response;
      if (url.includes("oauth2/token")) return json({ access_token: "t" });
      if (url.includes("flight-offers")) return json({ data: [{ price: { grandTotal: "100" } }, { price: { grandTotal: "300" } }, { price: { grandTotal: "200" } }] });
      if (url.includes("by-city")) return json({ data: [{ hotelId: "H1" }] });
      return json({ data: [{ offers: [{ price: { total: "900" } }] }] });
    });
    const quotes = await new AmadeusProvider("id", "secret", http as unknown as typeof fetch).getPrices(q);
    expect(quotes).toEqual([
      { category: "flight", unitPrice: 200, source: "amadeus" },
      { category: "stay", unitPrice: 300, source: "amadeus" },
    ]);
  });
  it("returns nothing for unknown destinations or failed auth", async () => {
    const bad = vi.fn(async () => ({ ok: false, status: 401 }) as Response);
    const p = new AmadeusProvider("id", "s", bad as unknown as typeof fetch);
    expect(await p.getPrices({ ...q, destination: "Nowhere" })).toEqual([]);
    expect(await p.getPrices(q)).toEqual([]);
  });
});

describe("AmadeusProvider dates and codes", () => {
  it("searches from the trip start date and resolves place names to airport codes", async () => {
    const urls: string[] = [];
    const http = vi.fn(async (url: string) => {
      urls.push(decodeURIComponent(url));
      const json = (body: unknown) => ({ ok: true, json: async () => body }) as Response;
      if (url.includes("oauth2/token")) return json({ access_token: "t" });
      return json({ data: [] });
    });
    const start = new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10);
    await new AmadeusProvider("id", "s", http as unknown as typeof fetch).getPrices({ ...q, origin: "Delhi", destination: "Hampi", startDate: start });
    expect(urls.some((u) => u.includes("cityCode=") || u.includes("destinationLocationCode="))).toBe(false); // Hampi is unknown
    const known: string[] = [];
    const http2 = vi.fn(async (url: string) => {
      known.push(decodeURIComponent(url));
      return { ok: true, json: async () => (url.includes("oauth2") ? { access_token: "t" } : { data: [] }) } as Response;
    });
    await new AmadeusProvider("id", "s", http2 as unknown as typeof fetch).getPrices({ ...q, origin: "Delhi", destination: "Jaipur", nights: 3, startDate: start });
    const flight = known.find((u) => u.includes("flight-offers"))!;
    expect(flight).toContain("originLocationCode=DEL");
    expect(flight).toContain(`departureDate=${start}`);
    expect(flight).toMatch(/returnDate=\d{4}-\d{2}-\d{2}/);
  });
});

describe("createPriceProvider", () => {
  it("works with no credentials", async () => {
    expect(await createPriceProvider({}).getPrices(q)).toHaveLength(9);
  });
});
