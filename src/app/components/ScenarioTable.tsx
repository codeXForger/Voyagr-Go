"use client";
import { useState } from "react";
import { formatMoney } from "@/domain/format";
import { scenarioTable } from "@/domain/pricing";
import { useTripStore } from "@/store/tripStore";
import { NumField } from "./NumField";

export function ScenarioTable() {
  const trip = useTripStore((s) => s.trip);
  const [max, setMax] = useState(8);
  const money = (n: number) => formatMoney(n, trip.config.currency);
  const rows = scenarioTable(trip, Math.min(50, Math.max(1, max)));
  const highest = Math.max(...rows.map((r) => r.perPerson), 1);

  return (
    <section className="panel overflow-hidden" aria-label="If N people go">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div>
          <h2 className="display text-lg font-semibold">What if a different number of people travel?</h2>
          <p className="text-sm text-muted">Rooms adjust to the number of travelers, and so do costs billed per person. A price for the whole group (like a cab) stays as you entered it. Your current plan is highlighted.</p>
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">Compare up to
          <div className="w-32"><NumField stepper label="Max people" min={1} value={max} onChange={setMax} /></div>
        </label>
      </div>
      <table className="w-full text-sm">
        <thead className="border-y border-line bg-sea-50/60 text-left text-xs font-medium text-muted">
          <tr><th className="px-4 py-2">People</th><th>Rooms</th><th className="w-1/3">Per person</th><th className="px-4 text-right">Total</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const current = r.people === trip.config.people;
            return (
              <tr key={r.people} className={`border-b border-line last:border-0 ${current ? "bg-saffron-100/70 font-medium" : ""}`}>
                <td className="px-4 py-2.5">{r.people}{current && <span className="ml-2 rounded-full bg-saffron-500 px-2 py-0.5 text-xs text-white">current</span>}</td>
                <td>{r.rooms}</td>
                <td className="pr-4">
                  <div className="flex items-center gap-3">
                    <span className="num w-24 shrink-0">{money(r.perPerson)}</span>
                    <span className="hidden h-2 flex-1 overflow-hidden rounded-full bg-sea-50 sm:block"><span className="block h-full rounded-full bg-sea-500" style={{ width: `${(r.perPerson / highest) * 100}%` }} /></span>
                  </div>
                </td>
                <td className="num px-4 text-right">{money(r.total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
