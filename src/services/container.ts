import { PdfExporter } from "./export/PdfExporter";
import { HttpPriceClient } from "./pricing/PriceClient";
import { GoogleDriveStorage } from "./storage/GoogleDriveStorage";
import { BrowserGoogleClient, isDriveConfigured } from "./storage/googleClient";
import { LocalFileStorage } from "./storage/LocalFileStorage";
import type { TripStorage } from "./storage/TripStorage";

/** Composition root: the only place concrete implementations are chosen. */
export function createServices() {
  const storages: TripStorage[] = [];
  if (isDriveConfigured()) storages.push(new GoogleDriveStorage(new BrowserGoogleClient()));
  storages.push(new LocalFileStorage());
  return { storages, exporter: new PdfExporter(), priceClient: new HttpPriceClient() };
}

export type Services = ReturnType<typeof createServices>;
