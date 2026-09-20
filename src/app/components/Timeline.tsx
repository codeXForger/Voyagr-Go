"use client";
import { CalendarDays } from "lucide-react";
import { dayDate, formatWeekday } from "@/domain/dates";
import { formatMoney } from "@/domain/format";
import { activityPeople, dayCost, placePeople, transferPeople } from "@/domain/itineraryCosts";
import { isHotelName, lodgingNotes } from "@/domain/stays";
import { modeOf, transferFrom } from "@/domain/transfers";
import { useTripStore } from "@/store/tripStore";
import { IconBadge } from "./IconBadge";

const Time = ({ value }: { value?: string }) => (
  <span className="num w-12 shrink-0 text-xs font-medium text-muted">{value || ""}</span>
);

/** Read-only, day-by-day view of the plan: stops, the transfers between them, and what each costs. */
export function Timeline() {
  const trip = useTripStore((s) => s.trip);
  const { config, itinerary, stays } = trip;
  const money = (n: number) => formatMoney(n, config.currency);

  return (
    <ol className="flex flex-col gap-3" aria-label="Timeline">
      {itinerary.map((d) => {
        const total = dayCost(itinerary, config, d.day);
        const date = dayDate(config, d.day);
        return (
          <li key={d.day} className="panel p-4" aria-label={`Day ${d.day} timeline`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
              <h3 className="display text-lg font-semibold">Day {d.day}{d.title && d.title !== `Day ${d.day}` ? `: ${d.title}` : ""}</h3>
              {date && <span className="num text-sm text-muted">{formatWeekday(date)}</span>}
              {total > 0 && <span className="num ml-auto text-sm text-muted">Day cost <b className="text-ink">{money(total)}</b></span>}
            </div>

            {lodgingNotes(stays, config, d.day).filter((n) => n.kind === "checkout").map((n) => (
              <p key={n.stay?.id} className="mb-2 flex items-center gap-2 rounded-lg bg-sea-50 px-3 py-1.5 text-sm text-muted" data-testid={`lodging-out-${d.day}`}>
                <IconBadge name="hotel" className="h-4 w-4 text-sea-700" />Check out of <b className="font-medium text-ink">{n.stay?.name.trim() || "Hotel"}</b>
              </p>
            ))}
            {d.places.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted"><CalendarDays className="h-4 w-4" />Nothing planned yet. Add places in Edit.</p>
            ) : (
              <ol className="relative ml-2 flex flex-col gap-1 border-l-2 border-sea-100 pl-5">
                {d.places.map((p, i) => {
                  const t = p.transferIn;
                  const mode = t ? modeOf(t.mode) : null;
                  const pn = placePeople(p, config);
                  return (
                    <li key={i} className="flex flex-col gap-1">
                      {t && mode && (
                        <div className="relative my-1 flex items-center gap-2 text-sm" data-testid={`transfer-${d.day}-${i}`}>
                          <span className="absolute -left-[2.05rem] grid h-6 w-6 place-items-center rounded-full border-2 border-sea-100 bg-white text-sea-700"><IconBadge name={mode.icon} className="h-3.5 w-3.5" /></span>
                          <Time value={t.time} />
                          <span className="rounded-full bg-sea-50 px-3 py-1 text-muted">
                            <b className="font-medium text-ink">{mode.label}</b> · {transferFrom(t, i > 0 ? d.places[i - 1].name : undefined)} to {p.name.trim() || "this place"}
                            {" · "}
                            <span className="num">{t.billing === "perPerson" ? `${money(t.cost)} × ${transferPeople(t, config)}` : `${money(t.cost)} total`}</span>
                          </span>
                        </div>
                      )}
                      <div className="relative flex items-start gap-2" data-testid={`stop-${d.day}-${i}`}>
                        <span className="absolute -left-[2.05rem] grid h-6 w-6 place-items-center rounded-full bg-sea-700 text-white"><IconBadge name={isHotelName(stays, p.name) ? "hotel" : "landmark"} className="h-3.5 w-3.5" /></span>
                        <Time value={p.time} />
                        <div className="min-w-0">
                          <div className="font-medium">{p.name.trim() || "Untitled place"}</div>
                          <div className="num text-xs text-muted">{p.fee > 0 ? `Entry ${money(p.fee)} × ${pn}` : "No entry fee"}{(p.parking ?? 0) > 0 ? ` · Parking ${money(p.parking ?? 0)}` : ""}</div>
                        </div>
                      </div>
                      {p.activities.length > 0 && (
                        <ul className="ml-14 flex flex-col gap-1 pb-1">
                          {p.activities.map((a, j) => (
                            <li key={j} className="flex items-center gap-2 text-sm" data-testid={`activity-${d.day}-${i}-${j}`}>
                              <IconBadge name="ticket" className="h-3.5 w-3.5 shrink-0 text-sea-700" />
                              <span className="num w-12 shrink-0 text-xs font-medium text-muted">{a.time || ""}</span>
                              <span className="min-w-0 truncate">{a.name.trim() || "Untitled activity"}</span>
                              <span className="num ml-auto shrink-0 text-xs text-muted">{money(a.price)} × {activityPeople(a, p, config)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {lodgingNotes(stays, config, d.day).filter((n) => n.kind !== "checkout").map((n, i) => (
              <p key={i} className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${n.kind === "none" ? "bg-saffron-100 text-saffron-700" : "bg-sea-100 text-sea-900"}`} data-testid={`lodging-${d.day}`}>
                <IconBadge name="hotel" className="h-4 w-4" />
                {n.kind === "none" ? "No hotel for tonight" : n.kind === "checkin" ? <>Check in to <b className="font-medium">{n.stay?.name.trim() || "Hotel"}</b> for the night</> : <>Staying at <b className="font-medium">{n.stay?.name.trim() || "Hotel"}</b> tonight</>}
              </p>
            ))}
          </li>
        );
      })}
    </ol>
  );
}
