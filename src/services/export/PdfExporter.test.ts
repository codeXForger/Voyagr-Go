// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createTrip } from "@/domain/trip";
import { PdfExporter } from "./PdfExporter";

describe("PdfExporter", () => {
  it("renders a real PDF including every icon", async () => {
    const trip = createTrip({ origin: "DEL", destination: "Goa" });
    trip.items.forEach((i) => (i.unitPrice = 1000));
    const blob = await new PdfExporter().export(trip, 4);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);
  }, 20000);
});
