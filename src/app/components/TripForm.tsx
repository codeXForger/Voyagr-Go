"use client";
import { ArrowLeftRight } from "lucide-react";
import { endDateOf } from "@/domain/dates";
import { fx } from "@/services/pricing/destinations";
import { useTripStore } from "@/store/tripStore";
import { LocationCombobox } from "./LocationCombobox";
import { NumField } from "./NumField";

const currencies = Object.keys(fx);

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <div className="text-sm font-medium">{label}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
    <div className="w-36 shrink-0">{children}</div>
  </div>
);

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="flex flex-col gap-3 border-t border-line pt-4 first:border-0 first:pt-0">
    <legend className="mb-1 float-left w-full font-display text-base font-semibold">{title}</legend>
    {children}
  </fieldset>
);

export function TripForm() {
  const { trip, setName, setConfig, setDays, setNights, setStartDate, setEndDate } = useTripStore();
  const c = trip.config;
  const end = endDateOf(c);

  return (
    <section className="panel flex flex-col gap-5 p-5" aria-label="Trip details">
      <Group title="Where are you going?">
        <input aria-label="Trip name" className="field font-medium" value={trip.name} onChange={(e) => setName(e.target.value)} />
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <LocationCombobox label="Origin" placeholder="From: city or airport" value={c.origin} onChange={(origin) => setConfig({ origin })} />
            <LocationCombobox label="Destination" placeholder="To: city or airport" value={c.destination} onChange={(destination) => setConfig({ destination })} />
          </div>
          <button type="button" className="icon-btn shrink-0 rotate-90 border border-line" aria-label="Swap from and to" title="Swap from and to" onClick={() => setConfig({ origin: c.destination, destination: c.origin })}>
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>
        <select aria-label="Currency" className="field" value={c.currency} onChange={(e) => setConfig({ currency: e.target.value })}>
          {currencies.map((x) => <option key={x}>{x}</option>)}
        </select>
      </Group>

      <Group title="When?">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            From date
            <input type="date" aria-label="From date" className="field text-ink" value={c.startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            To date
            <input type="date" aria-label="To date" className="field text-ink" value={end} min={c.startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <Row label="Days"><NumField stepper label="Days" min={1} value={c.days} onChange={setDays} /></Row>
        <Row label="Nights" hint="Linked to days and dates"><NumField stepper label="Nights" value={c.nights} onChange={setNights} /></Row>
      </Group>

      <Group title="Who is coming?">
        <Row label="People"><NumField stepper label="People" min={1} value={c.people} onChange={(people) => setConfig({ people })} /></Row>
        <Row label="Rooms"><NumField stepper label="Rooms" min={1} value={c.rooms} onChange={(rooms) => setConfig({ rooms })} /></Row>
        <Row label="Extra beds"><NumField stepper label="Extra beds" value={c.extraBeds} onChange={(extraBeds) => setConfig({ extraBeds })} /></Row>
      </Group>

      <details className="group border-t border-line pt-4">
        <summary className="cursor-pointer font-display text-base font-semibold marker:text-muted">Room and cab limits</summary>
        <div className="mt-3 flex flex-col gap-3">
          <Row label="Guests per room" hint="Used for group-size table"><NumField stepper label="Guests per room" min={1} value={c.roomOccupancy} onChange={(roomOccupancy) => setConfig({ roomOccupancy })} /></Row>
          <Row label="Seats per cab" hint="More cabs as the group grows"><NumField stepper label="Cab capacity" min={1} value={c.vehicleCapacity} onChange={(vehicleCapacity) => setConfig({ vehicleCapacity })} /></Row>
        </div>
      </details>
    </section>
  );
}
