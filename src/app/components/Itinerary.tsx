"use client";
import { dayDate, formatWeekday } from "@/domain/dates";
import { activityPeople, dayCost, placePeople } from "@/domain/itineraryCosts";
import { currencySymbol, formatMoney } from "@/domain/format";
import { newActivity, newPlace } from "@/domain/trip";
import type { ActivityStop, PlaceStop } from "@/domain/types";
import { useTripStore } from "@/store/tripStore";
import { useState } from "react";
import { ListEditor } from "./ListEditor";
import { NumField } from "./NumField";
import { hotelNames, isHotelName } from "@/domain/stays";
import { LodgingTags } from "./LodgingTags";
import { StaysEditor } from "./StaysEditor";
import { Timeline } from "./Timeline";
import { TransferEditor } from "./TransferEditor";

interface MetaProps {
  name: string;
  people: number;
  custom: boolean;
  defaultLabel: string;
  onPeople(n: number): void;
  onResetPeople(): void;
  priceLabel: string;
  price: number;
  onPrice(n: number): void;
  symbol: string;
  time?: string;
  onTime(t: string): void;
  /** Optional parking charge for the group (places only). */
  parking?: number;
  onParking?(n: number): void;
}

/** People + per-person price fields shown under a place or activity row. */
function Meta({ name, people, custom, defaultLabel, onPeople, onResetPeople, priceLabel, price, onPrice, symbol, time, onTime, parking, onParking }: MetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
      <label className="flex items-center gap-2">
        Time
        <input type="time" aria-label={`${name} time`} className="field h-8 w-28 text-xs" value={time ?? ""} onChange={(e) => onTime(e.target.value)} />
      </label>
      <label className="flex items-center gap-2">
        People
        <span className="w-16"><NumField compact label={`${name} people`} value={people} onChange={onPeople} /></span>
        {custom
          ? <button type="button" className="text-sea-700 underline underline-offset-2" onClick={onResetPeople}>use {defaultLabel}</button>
          : <span>({defaultLabel})</span>}
      </label>
      <label className="flex items-center gap-2">
        {priceLabel}
        <span className="w-28"><NumField compact prefix={symbol} step={10} label={`${name} ${priceLabel.toLowerCase()}`} value={price} onChange={onPrice} /></span>
      </label>
      {onParking && (
        <label className="flex items-center gap-2" title="Optional. One price for the group; leave 0 if there is none.">
          Parking (optional)
          <span className="w-28"><NumField compact prefix={symbol} step={10} label={`${name} parking`} value={parking ?? 0} onChange={onParking} /></span>
        </label>
      )}
    </div>
  );
}

export function Itinerary() {
  const { trip, updateDay } = useTripStore();
  const { config } = trip;
  const symbol = currencySymbol(config.currency);
  const [view, setView] = useState<"edit" | "timeline">("edit");
  const hotels = hotelNames(trip.stays);

  return (
    <section aria-label="Itinerary" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <p className="min-w-0 flex-1 text-sm text-muted">
          Add the places you'll visit each day, the activities at each place, and the transfers between stops (cab, ferry, flight and so on), and your hotels under Where you'll stay. Hotel, cab, flight and other costs all go here.
          Prices flow into the Costs tab automatically, and removing something here removes its cost. Times are optional. Drag the grip to reorder.
          For a cab hired for a whole day, add it as a transfer with the cost for the day.
        </p>
        <div role="group" aria-label="Itinerary view" className="inline-flex rounded-lg border border-line bg-white p-0.5 text-sm">
          {(["edit", "timeline"] as const).map((v) => (
            <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 font-medium capitalize ${view === v ? "bg-sea-700 text-white" : "text-muted hover:text-ink"}`}>{v}</button>
          ))}
        </div>
      </div>
      {view === "timeline" ? <Timeline /> : <StaysEditor />}
      <ol className={`flex flex-col gap-3 ${view === "timeline" ? "hidden" : ""}`}>
        {trip.itinerary.map((d) => (
          <li key={d.day} className="panel grid gap-4 p-4 md:grid-cols-[5rem_1fr]">
            <div className="display flex items-baseline gap-1 md:flex-col md:gap-0">
              <span className="text-sm font-medium text-muted">Day</span>
              <span className="text-3xl font-bold text-sea-700">{d.day}</span>
              {dayDate(config, d.day) && <span className="num text-xs font-medium text-muted md:mt-1">{formatWeekday(dayDate(config, d.day))}</span>}
            </div>
            <div className="grid gap-4">
              <LodgingTags stays={trip.stays} config={config} day={d.day} />
              <div className="flex items-center gap-3">
                <input aria-label={`Day ${d.day} title`} className="field font-medium" value={d.title} onChange={(e) => updateDay(d.day, { title: e.target.value })} />
                {dayCost(trip.itinerary, config, d.day) > 0 && (
                  <span className="num shrink-0 text-sm text-muted">Day cost <b className="text-ink">{formatMoney(dayCost(trip.itinerary, config, d.day), config.currency)}</b></span>
                )}
              </div>
              <ListEditor<PlaceStop>
                title="Places to visit" icon="landmark" name={`Day ${d.day}`} singular="place" placeholder="e.g. Fort Aguada"
                items={d.places} onChange={(places) => updateDay(d.day, { places })}
                suggestions={() => [{ label: "Your hotels", icon: "hotel", options: hotels }]}
                rowIcon={(p) => (isHotelName(trip.stays, p.name) ? "hotel" : "landmark")}
                getLabel={(p) => p.name} setLabel={(p, name) => ({ ...p, name })} makeBlank={newPlace}
                renderBefore={(place, i, updatePlace) => (
                  <TransferEditor
                    name={`Day ${d.day} place ${i + 1}`} transfer={place.transferIn} placeName={place.name} config={config} symbol={symbol}
                    previousPlace={i > 0 ? d.places[i - 1].name : undefined}
                    fromSuggestions={[
                      { label: "Your hotels", icon: "hotel", options: hotels },
                      { label: "Other places today", icon: "landmark", options: d.places.filter((_, k) => k !== i).map((p) => p.name.trim()).filter(Boolean) },
                    ]}
                    onChange={(transferIn) => updatePlace({ ...place, transferIn })}
                  />
                )}
                renderMeta={(place, i, updatePlace) => (
                  <Meta
                    name={`Day ${d.day} place ${i + 1}`} symbol={symbol}
                    time={place.time} onTime={(time) => updatePlace({ ...place, time })}
                    people={placePeople(place, config)} custom={place.people !== null} defaultLabel="everyone"
                    onPeople={(n) => updatePlace({ ...place, people: Math.max(0, Math.floor(n)) })}
                    onResetPeople={() => updatePlace({ ...place, people: null })}
                    priceLabel="Entry fee per person" price={place.fee} onPrice={(fee) => updatePlace({ ...place, fee: Math.max(0, fee) })}
                    parking={place.parking} onParking={(parking) => updatePlace({ ...place, parking: Math.max(0, parking) })}
                  />
                )}
                renderChildren={(place, i, updatePlace) => (
                  <ListEditor<ActivityStop>
                    icon="ticket" name={`Day ${d.day} place ${i + 1}`} singular="activity" placeholder="Activity here, e.g. Sunset cruise"
                    items={place.activities} onChange={(activities) => updatePlace({ ...place, activities })}
                    getLabel={(a) => a.name} setLabel={(a, name) => ({ ...a, name })} makeBlank={newActivity}
                    renderMeta={(activity, j, updateActivity) => (
                      <Meta
                        name={`Day ${d.day} place ${i + 1} activity ${j + 1}`} symbol={symbol}
                        time={activity.time} onTime={(time) => updateActivity({ ...activity, time })}
                        people={activityPeople(activity, place, config)} custom={activity.people !== null} defaultLabel="same as place"
                        onPeople={(n) => updateActivity({ ...activity, people: Math.max(0, Math.floor(n)) })}
                        onResetPeople={() => updateActivity({ ...activity, people: null })}
                        priceLabel="Price per person" price={activity.price} onPrice={(price) => updateActivity({ ...activity, price: Math.max(0, price) })}
                      />
                    )}
                  />
                )}
              />
              <textarea aria-label={`Day ${d.day} notes`} rows={2} className="field h-auto py-2" placeholder="Notes: timings, bookings, reminders" value={d.notes} onChange={(e) => updateDay(d.day, { notes: e.target.value })} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
