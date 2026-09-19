import type { DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import type { Trip } from "@/domain/types";
import type { ItineraryExporter } from "./ItineraryExporter";
import { buildReport } from "./report";

export class PdfExporter implements ItineraryExporter {
  readonly extension = "pdf";

  async export(trip: Trip, maxScenarioPeople: number): Promise<Blob> {
    // Loaded lazily: the PDF engine is large and browser-only.
    const [{ pdf }, { TripDocument }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./TripDocument"),
    ]);
    const doc = createElement(TripDocument, { report: buildReport(trip, maxScenarioPeople) });
    return pdf(doc as unknown as ReactElement<DocumentProps>).toBlob();
  }
}
