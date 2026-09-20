import type { IconKey, Transfer, TransferMode } from "./types";

export interface ModeDef {
  id: TransferMode;
  label: string;
  icon: IconKey;
  /** A cab is one price for the group; a ferry or bus ticket is per person. */
  billing: Transfer["billing"];
}

export const MODES: ModeDef[] = [
  { id: "cab", label: "Cab", icon: "car", billing: "group" },
  { id: "auto", label: "Auto or bike", icon: "bike", billing: "group" },
  { id: "bus", label: "Bus", icon: "bus", billing: "perPerson" },
  { id: "train", label: "Train or metro", icon: "train", billing: "perPerson" },
  { id: "ferry", label: "Ferry or boat", icon: "ship", billing: "perPerson" },
  { id: "flight", label: "Flight", icon: "plane", billing: "perPerson" },
  { id: "walk", label: "Walk", icon: "walk", billing: "group" },
  { id: "other", label: "Other", icon: "route", billing: "group" },
];

export const modeOf = (id: TransferMode): ModeDef => MODES.find((m) => m.id === id) ?? MODES[MODES.length - 1];

export const newTransfer = (mode: TransferMode = "cab"): Transfer => ({
  mode,
  from: "",
  cost: 0,
  billing: modeOf(mode).billing,
  people: null,
  time: "",
});

/** Switching mode also switches to that mode's usual billing (cab: group, ferry: per person). */
export const withMode = (t: Transfer, mode: TransferMode): Transfer => ({ ...t, mode, billing: modeOf(mode).billing });

/** Where a transfer starts: what the user typed, else the previous place, else "Start". */
export const transferFrom = (t: Transfer, previousPlaceName?: string): string =>
  t.from.trim() || previousPlaceName?.trim() || "Start";
