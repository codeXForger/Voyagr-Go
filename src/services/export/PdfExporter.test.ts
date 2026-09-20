// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createTrip } from "@/domain/trip";
import { PdfExporter } from "./PdfExporter";

describe("PdfExporter", () => {
  it("renders a real PDF including every icon", async () => {
    const trip = createTrip({ origin: "DEL", destination: "Goa" });
    trip.items.forEach((i) => (i.unitPrice = 1000));
    trip.stays = [
      { id: "h1", name: "Sea View", checkIn: 1, nights: 2, roomPrice: 3500, rooms: null, guestsPerRoom: 2, extraBeds: 1, extraBedPrice: 900 },
      { id: "h2", name: "City Inn", checkIn: 3, nights: 1, roomPrice: 2500, rooms: 1, guestsPerRoom: 2, extraBeds: 0, extraBedPrice: 0 },
    ];
    trip.itinerary[0].places = [
      { name: "Airport", time: "09:00", transferIn: null, people: null, fee: 0, activities: [] },
      {
        name: "Hotel", time: "10:30", people: null, fee: 0,
        transferIn: { mode: "cab", from: "", cost: 800, billing: "group", people: null, time: "09:45" },
        activities: [{ name: "Spa", time: "17:00", people: 1, price: 500 }],
      },
    ];
    const blob = await new PdfExporter().export(trip, 4);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);
  }, 20000);
});
