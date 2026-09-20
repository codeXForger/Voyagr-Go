"use client";
import { AlertTriangle, BedDouble, Plus, X } from "lucide-react";
import { dayDate, formatDate } from "@/domain/dates";
import { currencySymbol, formatMoney } from "@/domain/format";
import { overlappingStays, runsOf, stayCheckOut, stayNights, stayRooms, stayTotal, uncoveredNights } from "@/domain/stays";
import type { Stay } from "@/domain/types";
import { useTripStore } from "@/store/tripStore";
import { STAY_COLORS } from "../ui";
import { NumField } from "./NumField";

const nightsText = (n: number) => `${n} ${n === 1 ? "night" : "nights"}`;

/** "Day 3 · 14 Oct" (date only when a start date is set). */
function dayLabel(config: Parameters<typeof dayDate>[0], day: number) {
  const date = dayDate(config, day);
  return date ? `Day ${day} · ${formatDate(date)}` : `Day ${day}`;
}

/** Hotels for the trip: a strip showing which hotel covers which night, and a card per hotel. */
export function StaysEditor() {
  const { trip, addStay, updateStay, removeStay } = useTripStore();
  const { config, stays } = trip;
  const money = (n: number) => formatMoney(n, config.currency);
  const symbol = currencySymbol(config.currency);
  const gaps = uncoveredNights(stays, config);

  // Night strip: one cell per night, merged into a block per hotel; gaps are clickable.
  const cells: { start: number; length: number; stay?: Stay }[] = [];
  for (let night = 1; night <= config.nights; night++) {
    const stay = stays.find((s) => night >= s.checkIn && night < s.checkIn + s.nights);
    const last = cells[cells.length - 1];
    if (last && last.stay?.id === stay?.id && last.start + last.length === night) last.length++;
    else cells.push({ start: night, length: 1, stay });
  }

  return (
    <section aria-label="Where you'll stay" className="panel p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="display text-lg font-semibold">Where you'll stay</h2>
          <p className="text-sm text-muted">
            Add each hotel and the nights you spend there. Moving to a new hotel? Add another one. Rooms and extra beds are charged per night
            and show up under Daily charges.
          </p>
        </div>
        <button className="btn btn-primary h-9" disabled={config.nights === 0} onClick={() => addStay()}>
          <Plus className="h-4 w-4" />Add hotel
        </button>
      </div>

      {config.nights === 0 ? (
        <p className="mt-3 rounded-lg bg-saffron-100 px-3 py-2 text-sm text-saffron-700">This is a day trip with no nights, so no hotel is needed. Add a night to plan one.</p>
      ) : (
        <>
          <div className="mt-4" role="img" aria-label={`Hotels by night: ${stays.length === 0 ? "none yet" : stays.map((s) => `${s.name} nights ${s.checkIn} to ${s.checkIn + s.nights - 1}`).join(", ")}`}>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${config.nights}, minmax(0, 1fr))` }}>
              {cells.map((c) => {
                const i = c.stay ? stays.indexOf(c.stay) : -1;
                const style = { gridColumn: `${c.start} / span ${c.length}` };
                return c.stay ? (
                  <div key={c.start} style={{ ...style, background: STAY_COLORS[i % STAY_COLORS.length] }} className="min-w-0 truncate rounded-md px-2 py-2 text-xs font-medium text-white" title={`${c.stay.name}: ${nightsText(c.length)}`}>
                    {c.stay.name.trim() || "Hotel"}
                  </div>
                ) : (
                  <button
                    key={c.start} style={style} type="button" title="Add a hotel for these nights"
                    onClick={() => addStay({ checkIn: c.start, nights: c.length })}
                    className="flex min-w-0 items-center justify-center gap-1 truncate rounded-md border border-dashed border-saffron-500 bg-saffron-100/50 px-2 py-2 text-xs font-medium text-saffron-700 hover:bg-saffron-100"
                  >
                    <Plus className="h-3 w-3 shrink-0" />No hotel
                  </button>
                );
              })}
            </div>
            <div className="mt-1 grid text-[11px] text-muted" style={{ gridTemplateColumns: `repeat(${config.nights}, minmax(0, 1fr))` }}>
              {Array.from({ length: config.nights }, (_, i) => (
                <span key={i} className="num truncate text-center">{config.nights <= 10 ? `Night ${i + 1}` : i + 1}</span>
              ))}
            </div>
          </div>

          {gaps.length > 0 && stays.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-saffron-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              No hotel for {runsOf(gaps).map((r) => (r.length === 1 ? `night ${r.start}` : `nights ${r.start} to ${r.start + r.length - 1}`)).join(" and ")}.
            </p>
          )}

          {stays.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-center">
              <BedDouble className="h-8 w-8 text-sea-500" />
              <p className="text-sm text-muted">No hotels yet. Add one to start counting room costs.</p>
              <button className="btn btn-primary" onClick={() => addStay()}><Plus className="h-4 w-4" />Add your first hotel</button>
            </div>
          ) : (
            <ol className="mt-4 flex flex-col gap-3">
              {stays.map((s, i) => {
                const n = `Hotel ${i + 1}`;
                const color = STAY_COLORS[i % STAY_COLORS.length];
                const nightsIn = stayNights(s, config);
                const rooms = stayRooms(s, config);
                const totals = stayTotal(s, config);
                const overlap = overlappingStays(stays, s);
                const checkOut = stayCheckOut(s);
                const inputs = { checkIn: Array.from({ length: config.nights }, (_, k) => k + 1), checkOut: Array.from({ length: config.days - s.checkIn }, (_, k) => s.checkIn + 1 + k) };
                return (
                  <li key={s.id} className="rounded-xl border border-line bg-white p-3" style={{ borderLeft: `4px solid ${color}` }}>
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 shrink-0" style={{ color }} />
                      <input aria-label={`${n} name`} className="ghost font-medium" placeholder="Hotel name" value={s.name} onChange={(e) => updateStay(s.id, { name: e.target.value })} />
                      <button className="icon-btn shrink-0" aria-label={`Remove ${n}`} onClick={() => removeStay(s.id)}><X className="h-4 w-4" /></button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <label className="flex items-center gap-2 text-muted">
                        Check in
                        <select aria-label={`${n} check in`} className="field h-9 w-auto text-ink" value={s.checkIn} onChange={(e) => updateStay(s.id, { checkIn: Number(e.target.value), nights: Math.max(1, checkOut - Number(e.target.value)) })}>
                          {inputs.checkIn.map((d) => <option key={d} value={d}>{dayLabel(config, d)}</option>)}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-muted">
                        Check out
                        <select aria-label={`${n} check out`} className="field h-9 w-auto text-ink" value={Math.min(checkOut, config.days)} onChange={(e) => updateStay(s.id, { nights: Number(e.target.value) - s.checkIn })}>
                          {inputs.checkOut.map((d) => <option key={d} value={d}>{dayLabel(config, d)}</option>)}
                        </select>
                      </label>
                      <span className="rounded-full bg-sea-100 px-2.5 py-1 text-xs font-medium text-sea-900">{nightsText(nightsIn)}</span>
                    </div>

                    {(s.checkIn + s.nights - 1 > config.nights || overlap.length > 0) && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-saffron-700">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        {s.checkIn + s.nights - 1 > config.nights ? "Goes past the end of the trip; extra nights are not charged. " : ""}
                        {overlap.length > 0 ? `Shares nights with ${overlap.map((o) => o.name.trim() || "another hotel").join(", ")}.` : ""}
                      </p>
                    )}

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                        Price per room per night
                        <NumField prefix={symbol} step={100} label={`${n} price per room`} value={s.roomPrice} onChange={(roomPrice) => updateStay(s.id, { roomPrice })} />
                      </label>
                      <div className="flex flex-col gap-1 text-xs font-medium text-muted">
                        Rooms
                        <NumField stepper label={`${n} rooms`} min={1} value={rooms} onChange={(r) => updateStay(s.id, { rooms: r })} />
                        {s.rooms === null
                          ? <span className="font-normal">Auto: enough for {config.people} {config.people === 1 ? "person" : "people"}</span>
                          : <button className="w-fit font-normal text-sea-700 underline underline-offset-2" onClick={() => updateStay(s.id, { rooms: null })}>use auto</button>}
                      </div>
                      <div className="flex flex-col gap-1 text-xs font-medium text-muted">
                        People per room
                        <NumField stepper label={`${n} guests per room`} min={1} value={s.guestsPerRoom} onChange={(guestsPerRoom) => updateStay(s.id, { guestsPerRoom })} />
                      </div>
                      <div className="flex flex-col gap-1 text-xs font-medium text-muted">
                        Extra beds
                        <NumField stepper label={`${n} extra beds`} value={s.extraBeds} onChange={(extraBeds) => updateStay(s.id, { extraBeds })} />
                      </div>
                    </div>
                    {s.extraBeds > 0 && (
                      <label className="mt-3 flex max-w-xs flex-col gap-1 text-xs font-medium text-muted">
                        Price per extra bed per night
                        <NumField prefix={symbol} step={50} label={`${n} price per extra bed`} value={s.extraBedPrice} onChange={(extraBedPrice) => updateStay(s.id, { extraBedPrice })} />
                      </label>
                    )}

                    <p className="num mt-3 border-t border-line pt-2 text-sm text-muted">
                      {rooms} {rooms === 1 ? "room" : "rooms"} × {nightsText(nightsIn)} × {money(s.roomPrice)} = <b className="text-ink">{money(totals.rooms)}</b>
                      {s.extraBeds > 0 && <> · {s.extraBeds} extra {s.extraBeds === 1 ? "bed" : "beds"} × {nightsText(nightsIn)} × {money(s.extraBedPrice)} = <b className="text-ink">{money(totals.beds)}</b></>}
                      <span className="ml-2 font-semibold text-sea-900">Hotel total {money(totals.total)}</span>
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
