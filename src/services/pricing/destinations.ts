import data from "@/data/destinations.json";

export interface Destination {
  name: string;
  country: string;
  iata: string;
  flight: number;
  stay: number;
  extraBed: number;
  cab: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  places: number;
  activities: number;
}

export const destinations: Destination[] = data.destinations;
export const fx: Record<string, number> = data.fx;

export const findDestination = (name: string) =>
  destinations.find((d) => d.name.toLowerCase() === name.trim().toLowerCase());

export const convertFromInr = (inr: number, currency: string) =>
  Math.round(inr * (fx[currency] ?? 1) * 100) / 100;
