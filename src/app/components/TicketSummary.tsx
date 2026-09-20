"use client";
import { formatRange } from "@/domain/dates";
import { formatMoney } from "@/domain/format";
import { toIata } from "@/domain/locations";
import { maxRooms } from "@/domain/stays";
import { summarize } from "@/domain/pricing";
import { useTripStore } from "@/store/tripStore";
import { useLocationsReady } from "../useLocationsReady";
import { IconBadge } from "./IconBadge";

const code = (s: string, fallback: string) => {
  const t = s.trim();
  if (!t) return fallback;
  return toIata(t) || (/^[A-Za-z]{3}$/.test(t) ? t.toUpperCase() : t.length > 12 ? t.slice(0, 12) + "…" : t);
};

/** Boarding-pass style summary: the route on the left, per-person and trip cost on the stub. */
export function TicketSummary() {
  useLocationsReady(); // airport codes need the full list
  const trip = useTripStore((s) => s.trip);
  const { config: c } = trip;
  const { grandTotal, perPerson } = summarize(trip);
  const money = (n: number) => formatMoney(n, c.currency, "symbol", 0);
  const range = formatRange(c);
  const facts = [
    ...(range ? [range] : []),
    `${c.days} ${c.days === 1 ? "day" : "days"}, ${c.nights} ${c.nights === 1 ? "night" : "nights"}`,
    `${c.people} ${c.people === 1 ? "traveler" : "travelers"}`,
    ...(trip.stays.length ? [`${trip.stays.length} ${trip.stays.length === 1 ? "hotel" : "hotels"}, up to ${maxRooms(trip.stays, c)} ${maxRooms(trip.stays, c) === 1 ? "room" : "rooms"}`] : [])
  ];

  return (
    <section aria-label="Trip summary" className="ticket grid overflow-hidden rounded-2xl text-white sm:grid-cols-[minmax(0,1fr)_minmax(0,0.42fr)] max-sm:[--stub-x:-100%]">
      <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="display text-3xl font-semibold sm:text-5xl">{code(c.origin, "Home")}</div>
          <div className="flex flex-1 items-center gap-2 text-saffron-500" aria-hidden="true">
            <span className="h-px flex-1 border-t border-dashed border-white/30" />
            <IconBadge name="plane" className="h-6 w-6 rotate-45" />
            <span className="h-px flex-1 border-t border-dashed border-white/30" />
          </div>
          <div className="display text-3xl font-semibold sm:text-5xl">{code(c.destination, "Anywhere")}</div>
        </div>
        <ul className="flex flex-wrap gap-2 text-sm">
          {facts.map((f) => <li key={f} className="rounded-full bg-white/10 px-3 py-1">{f}</li>)}
        </ul>
      </div>
      <div className="perforation flex flex-col justify-center gap-4 p-6 sm:p-8">
        <div>
          <div className="text-sm text-white/70">Per person</div>
          <div className="display num text-3xl font-bold text-saffron-500 sm:text-4xl">{money(perPerson)}</div>
        </div>
        <div>
          <div className="text-sm text-white/70">Whole trip, {c.people} {c.people === 1 ? "person" : "people"}</div>
          <div className="display num text-xl font-semibold">{money(grandTotal)}</div>
        </div>
      </div>
    </section>
  );
}
