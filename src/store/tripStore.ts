import { create } from "zustand";
import { buildItinerary, createTrip, newId, withDays, withNights } from "@/domain/trip";
import { getCategory } from "@/domain/categories";
import { addDays, diffDays, isIsoDate } from "@/domain/dates";
import { withLinkedPrice } from "@/domain/itineraryCosts";
import type { CategoryId, CostItem, DayPlan, ItemLink, Trip, TripConfig } from "@/domain/types";
import type { PriceClient } from "@/services/pricing/PriceClient";
import type { PriceQuote } from "@/services/pricing/PriceProvider";

const MAX_NIGHTS = 90;
const clampInt = (n: number, min: number) => Math.max(min, Math.floor(Number.isFinite(n) ? n : min));

export interface TripState {
  trip: Trip;
  pricing: "idle" | "loading" | "error";
  setName(name: string): void;
  setConfig(patch: Partial<TripConfig>): void;
  setDays(days: number): void;
  setNights(nights: number): void;
  setStartDate(iso: string): void;
  /** Sets the trip length from the end date (and the start date too, if none is chosen yet). */
  setEndDate(iso: string): void;
  updateItem(id: string, patch: Partial<Omit<CostItem, "id">>): void;
  addItem(category: CategoryId): void;
  removeItem(id: string): void;
  /** Changes the price of a cost line that is owned by an itinerary place or activity. */
  setLinkedPrice(link: ItemLink, price: number): void;
  updateDay(day: number, patch: Partial<DayPlan>): void;
  applyQuotes(quotes: PriceQuote[]): void;
  refreshPrices(client: PriceClient): Promise<void>;
  loadTrip(trip: Trip): void;
  reset(): void;
}

/** Factory so tests get an isolated store; the app uses the `useTripStore` singleton. */
export const createTripStore = (initial: Trip = createTrip()) =>
  create<TripState>((set, get) => ({
    trip: initial,
    pricing: "idle",

    setName: (name) => set((s) => ({ trip: { ...s.trip, name } })),

    setConfig: (patch) =>
      set((s) => {
        const c = { ...s.trip.config, ...patch };
        c.people = clampInt(c.people, 1);
        c.rooms = clampInt(c.rooms, 1);
        c.extraBeds = clampInt(c.extraBeds, 0);
        c.roomOccupancy = clampInt(c.roomOccupancy, 1);
        c.vehicleCapacity = clampInt(c.vehicleCapacity, 1);
        return { trip: { ...s.trip, config: c } };
      }),

    setDays: (days) =>
      set((s) => {
        const config = withDays(s.trip.config, days);
        return { trip: { ...s.trip, config, itinerary: buildItinerary(config.days, s.trip.itinerary) } };
      }),

    setNights: (nights) =>
      set((s) => {
        const config = withNights(s.trip.config, nights);
        return { trip: { ...s.trip, config, itinerary: buildItinerary(config.days, s.trip.itinerary) } };
      }),

    setStartDate: (iso) => set((s) => ({ trip: { ...s.trip, config: { ...s.trip.config, startDate: iso === "" || isIsoDate(iso) ? iso : s.trip.config.startDate } } })),

    setEndDate: (iso) =>
      set((s) => {
        if (!isIsoDate(iso)) return s;
        const c = s.trip.config;
        const startDate = isIsoDate(c.startDate) ? c.startDate : addDays(iso, -c.nights);
        const nights = diffDays(startDate, iso);
        if (nights < 0) return s; // end before start: ignore
        const config = { ...withNights(c, Math.min(nights, MAX_NIGHTS)), startDate };
        return { trip: { ...s.trip, config, itinerary: buildItinerary(config.days, s.trip.itinerary) } };
      }),

    updateItem: (id, patch) =>
      set((s) => ({
        trip: {
          ...s.trip,
          items: s.trip.items.map((i) =>
            i.id !== id
              ? i
              : {
                  ...i,
                  ...patch,
                  unitPrice: Math.max(0, patch.unitPrice ?? i.unitPrice),
                  // Editing the price pins it so refreshes never clobber user input.
                  overridden: patch.unitPrice !== undefined ? true : (patch.overridden ?? i.overridden),
                },
          ),
        },
      })),

    addItem: (category) =>
      set((s) => {
        const c = getCategory(category);
        if (c.linked) return s; // places and activities are added from the itinerary
        const item: CostItem = {
          id: newId(category), category, label: c.defaultLabel, unitPrice: 0,
          basis: c.defaultBasis, count: 1, overridden: false,
        };
        return { trip: { ...s.trip, items: [...s.trip.items, item] } };
      }),

    removeItem: (id) => set((s) => ({ trip: { ...s.trip, items: s.trip.items.filter((i) => i.id !== id) } })),

    setLinkedPrice: (link, price) =>
      set((s) => ({ trip: { ...s.trip, itinerary: withLinkedPrice(s.trip.itinerary, link, price) } })),

    updateDay: (day, patch) =>
      set((s) => ({
        trip: { ...s.trip, itinerary: s.trip.itinerary.map((d) => (d.day === day ? { ...d, ...patch } : d)) },
      })),

    applyQuotes: (quotes) =>
      set((s) => {
        const byCategory = new Map(quotes.map((q) => [q.category, q.unitPrice]));
        return {
          trip: {
            ...s.trip,
            items: s.trip.items.map((i) =>
              !i.overridden && byCategory.has(i.category) ? { ...i, unitPrice: byCategory.get(i.category)! } : i,
            ),
          },
        };
      }),

    refreshPrices: async (client) => {
      const { config } = get().trip;
      set({ pricing: "loading" });
      try {
        const quotes = await client.fetchQuotes({
          origin: config.origin, destination: config.destination, currency: config.currency,
          startDate: config.startDate || undefined,
          days: config.days, nights: config.nights, people: config.people,
        });
        get().applyQuotes(quotes);
        set({ pricing: "idle" });
      } catch {
        set({ pricing: "error" });
      }
    },

    loadTrip: (trip) => set({ trip, pricing: "idle" }),
    reset: () => set({ trip: createTrip(), pricing: "idle" }),
  }));

export const useTripStore = createTripStore();
