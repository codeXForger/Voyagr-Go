import type { Trip } from "@/domain/types";

/** A place trips can be saved to and opened from. */
export interface TripStorage {
  readonly name: string;
  save(trip: Trip): Promise<void>;
  /** Resolves null when the user cancels. */
  open(): Promise<Trip | null>;
}
