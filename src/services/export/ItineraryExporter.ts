import type { Trip } from "@/domain/types";

export interface ItineraryExporter {
  readonly extension: string;
  export(trip: Trip, maxScenarioPeople: number): Promise<Blob>;
}
