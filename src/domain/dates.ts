import type { TripConfig } from "./types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const isIsoDate = (s: string) => ISO.test(s) && !Number.isNaN(utc(s).getTime());

export function addDays(iso: string, n: number): string {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const diffDays = (from: string, to: string) => Math.round((utc(to).getTime() - utc(from).getTime()) / 864e5);

/** The trip's last date: the start date plus the number of nights. "" until a start date is set. */
export const endDateOf = (c: Pick<TripConfig, "startDate" | "nights">) =>
  isIsoDate(c.startDate) ? addDays(c.startDate, c.nights) : "";

/** Calendar date of itinerary day `day` (1-based). "" until a start date is set. */
export const dayDate = (c: Pick<TripConfig, "startDate">, day: number) =>
  isIsoDate(c.startDate) ? addDays(c.startDate, day - 1) : "";

export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  utc(iso).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });

export const formatWeekday = (iso: string) => formatDate(iso, { weekday: "short", day: "numeric", month: "short" });

/** "12 Oct to 15 Oct 2026" (years shown on both ends only when they differ). */
export function formatRange(c: Pick<TripConfig, "startDate" | "nights">): string {
  const end = endDateOf(c);
  if (!end) return "";
  const sameYear = c.startDate.slice(0, 4) === end.slice(0, 4);
  const start = formatDate(c.startDate, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  return `${start} to ${formatDate(end, { day: "numeric", month: "short", year: "numeric" })}`;
}
