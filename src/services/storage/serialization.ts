import { parseTrip } from "@/domain/schema";
import type { Trip } from "@/domain/types";

export const fileNameFor = (trip: Trip) =>
  `${trip.name.replace(/[^\w\-]+/g, "_") || "trip"}.voyagr.json`;

export const serializeTrip = (trip: Trip) => JSON.stringify(trip, null, 2);

export const deserializeTrip = (text: string): Trip => parseTrip(JSON.parse(text));
