import type { CostItem, PricingBasis, TripConfig } from "../types";

/** Strategy: turns trip configuration into the quantity an item is billed for. */
export interface PricingStrategy {
  quantity(config: TripConfig, item: CostItem): number;
}

const nonNeg = (n: number) => Math.max(0, Number.isFinite(n) ? n : 0);

const strategies = new Map<PricingBasis, PricingStrategy>();

/** Open/Closed: add a new basis by registering a strategy, no calculator edits. */
export function registerStrategy(basis: PricingBasis, strategy: PricingStrategy) {
  strategies.set(basis, strategy);
}

export function getStrategy(basis: PricingBasis): PricingStrategy {
  const s = strategies.get(basis);
  if (!s) throw new Error(`No pricing strategy registered for basis "${basis}"`);
  return s;
}

const define = (basis: PricingBasis, fn: (c: TripConfig) => number) =>
  registerStrategy(basis, { quantity: (c, i) => nonNeg(fn(c)) * nonNeg(i.count) });

define("perPerson", (c) => c.people);
define("perVehicleDay", (c) => Math.ceil(c.people / Math.max(1, c.vehicleCapacity)) * c.days);
define("perPersonDay", (c) => c.people * c.days);
define("perPersonNight", (c) => c.people * c.nights);
define("flat", () => 1);
