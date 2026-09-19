import type { Trip } from "@/domain/types";
import { deserializeTrip, fileNameFor, serializeTrip } from "./serialization";
import type { TripStorage } from "./TripStorage";

/** Saves to / opens from a JSON file on the user's machine. */
export class LocalFileStorage implements TripStorage {
  readonly name = "This device";

  async save(trip: Trip): Promise<void> {
    const url = URL.createObjectURL(new Blob([serializeTrip(trip)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileNameFor(trip);
    a.click();
    URL.revokeObjectURL(url);
  }

  open(): Promise<Trip | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        try {
          resolve(deserializeTrip(await file.text()));
        } catch (e) {
          reject(e);
        }
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}
