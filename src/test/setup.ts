import "@testing-library/jest-dom/vitest";
import { loadAllLocations } from "@/domain/locations";

// Tests search the full airport list synchronously, so load it up front.
await loadAllLocations();
