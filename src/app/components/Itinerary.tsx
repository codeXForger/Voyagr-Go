"use client";
import { dayDate, formatWeekday } from "@/domain/dates";
import { activityPeople, placePeople } from "@/domain/itineraryCosts";
import { currencySymbol } from "@/domain/format";
import { newActivity, newPlace } from "@/domain/trip";
import type { ActivityStop, PlaceStop } from "@/domain/types";
import { useTripStore } from "@/store/tripStore";
import { ListEditor } from "./ListEditor";
import { NumField } from "./NumField";

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
}

/** People + per-person price fields shown under a place or activity row. */
function Meta({ name, people, custom, defaultLabel, onPeople, onResetPeople, priceLabel, price, onPrice, symbol }: MetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
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
    </div>
  );
}

export function Itinerary() {
  const { trip, updateDay } = useTripStore();
  const { config } = trip;
  const symbol = currencySymbol(config.currency);

  return (
    <section aria-label="Itinerary" className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Add the places you'll visit each day, then the activities at each place. Entry fees and activity prices are per person and
        flow into the Costs tab automatically. Remove a row here to remove its cost. Drag the grip to reorder.
      </p>
      <ol className="flex flex-col gap-3">
        {trip.itinerary.map((d) => (
          <li key={d.day} className="panel grid gap-4 p-4 md:grid-cols-[5rem_1fr]">
            <div className="display flex items-baseline gap-1 md:flex-col md:gap-0">
              <span className="text-sm font-medium text-muted">Day</span>
              <span className="text-3xl font-bold text-sea-700">{d.day}</span>
              {dayDate(config, d.day) && <span className="num text-xs font-medium text-muted md:mt-1">{formatWeekday(dayDate(config, d.day))}</span>}
            </div>
            <div className="grid gap-4">
              <input aria-label={`Day ${d.day} title`} className="field font-medium" value={d.title} onChange={(e) => updateDay(d.day, { title: e.target.value })} />
              <ListEditor<PlaceStop>
                title="Places to visit" icon="landmark" name={`Day ${d.day}`} singular="place" placeholder="e.g. Fort Aguada"
                items={d.places} onChange={(places) => updateDay(d.day, { places })}
                getLabel={(p) => p.name} setLabel={(p, name) => ({ ...p, name })} makeBlank={newPlace}
                renderMeta={(place, i, updatePlace) => (
                  <Meta
                    name={`Day ${d.day} place ${i + 1}`} symbol={symbol}
                    people={placePeople(place, config)} custom={place.people !== null} defaultLabel="everyone"
                    onPeople={(n) => updatePlace({ ...place, people: Math.max(0, Math.floor(n)) })}
                    onResetPeople={() => updatePlace({ ...place, people: null })}
                    priceLabel="Entry fee per person" price={place.fee} onPrice={(fee) => updatePlace({ ...place, fee: Math.max(0, fee) })}
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
