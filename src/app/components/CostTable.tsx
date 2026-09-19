"use client";
import { Lock, Plus, RotateCcw, Trash2 } from "lucide-react";
import { CATEGORIES, getCategory, SECTIONS, type CostSection } from "@/domain/categories";
import { currencySymbol, formatMoney } from "@/domain/format";
import { round2, summarize } from "@/domain/pricing";
import type { LineCost } from "@/domain/types";
import { useTripStore } from "@/store/tripStore";
import { CATEGORY_COLOR } from "../ui";
import { IconBadge } from "./IconBadge";
import { NumField } from "./NumField";

const COLS = "md:grid-cols-[minmax(0,2.2fr)_9rem_minmax(0,1fr)_minmax(0,1fr)_2rem]";

export function CostTable({ onOpenItinerary }: { onOpenItinerary?: () => void }) {
  const { trip, updateItem, addItem, removeItem, setLinkedPrice } = useTripStore();
  const { days, people, currency } = trip.config;
  const money = (n: number) => formatMoney(n, currency);
  const summary = summarize(trip);
  const symbol = currencySymbol(currency);
  const empty = summary.grandTotal === 0;

  // Plain function (not a component) so rows keep their identity and inputs keep focus while typing.
  const renderRow = (l: LineCost) => {
    const cat = getCategory(l.item.category);
    const link = l.item.link;
    const people = `${l.quantity} ${l.quantity === 1 ? "person" : "people"}`;
    return (
      <li key={l.item.id} data-testid={`row-${l.item.category}`} className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 ${COLS}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: CATEGORY_COLOR[l.item.category] }} title={cat.label}>
            <IconBadge name={cat.icon} className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            {link ? (
              <div className="truncate font-medium" title={l.item.label}>{l.item.label}</div>
            ) : (
              <input aria-label={`${cat.label} label`} className="ghost -ml-2 font-medium" value={l.item.label} onChange={(e) => updateItem(l.item.id, { label: e.target.value })} />
            )}
            <div className="num truncate text-xs text-muted">{link ? `${l.item.note} · per person · ${people}` : `${cat.unitLabel} · quantity ${l.quantity}`}</div>
          </div>
        </div>
        {link ? (
          <button
            className="icon-btn md:order-last text-sea-700" aria-label={`${l.item.label} is managed in the itinerary. Open itinerary`}
            title="Managed in the Itinerary tab. Add or remove it there." onClick={onOpenItinerary}
          >
            <Lock className="h-4 w-4" />
          </button>
        ) : (
          <button className="icon-btn md:order-last" aria-label={`Remove ${l.item.label}`} onClick={() => removeItem(l.item.id)}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <div className="col-span-2 flex items-center gap-2 md:col-span-1">
          <div className="w-36"><NumField prefix={symbol} label={link ? `${l.item.label} price` : `${cat.label} unit price`} step={10} value={l.item.unitPrice} onChange={(unitPrice) => (link ? setLinkedPrice(link, unitPrice) : updateItem(l.item.id, { unitPrice }))} /></div>
          {!link && l.item.overridden && (
            <button className="inline-flex items-center gap-1 rounded-full bg-saffron-100 px-2 py-1 text-xs font-medium text-saffron-700 hover:bg-saffron-500/30" title="You edited this price. Click to let estimates update it again." onClick={() => updateItem(l.item.id, { overridden: false })}>
              edited <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="num text-sm md:text-right"><span className="text-muted md:hidden">Per person </span>{money(l.perPerson)}</div>
        <div className="num text-right font-semibold">{money(l.total)}</div>
      </li>
    );
  };

  const renderSection = (id: CostSection) => {
    const def = SECTIONS.find((s) => s.id === id)!;
    const cats = CATEGORIES.filter((c) => c.section === id && !c.linked);
    const lines = summary.lines.filter((l) => getCategory(l.item.category).section === id);
    const total = round2(lines.reduce((s, l) => s + l.total, 0));
    const perPerson = people > 0 ? round2(total / people) : 0;
    return (
      <div className="panel overflow-hidden" key={id} aria-label={def.title} role="group">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="display text-lg font-semibold">{def.title}</h2>
            <p className="text-sm text-muted">{def.description}</p>
          </div>
          {id === "daily" ? (
            <dl className="num flex gap-5 text-sm">
              <div><dt className="text-xs text-muted">Per day</dt><dd className="font-semibold">{money(days > 0 ? round2(total / days) : 0)}</dd></div>
              <div><dt className="text-xs text-muted">Per person per day</dt><dd className="font-semibold">{money(days > 0 ? round2(perPerson / days) : 0)}</dd></div>
              <div><dt className="text-xs text-muted">{days} {days === 1 ? "day" : "days"} total</dt><dd className="font-semibold text-sea-900">{money(total)}</dd></div>
            </dl>
          ) : (
            <dl className="num flex gap-5 text-sm">
              <div><dt className="text-xs text-muted">Per person</dt><dd className="font-semibold">{money(perPerson)}</dd></div>
              <div><dt className="text-xs text-muted">Total</dt><dd className="font-semibold text-sea-900">{money(total)}</dd></div>
            </dl>
          )}
        </div>
        <div className={`hidden gap-3 border-b border-line bg-sea-50/60 px-4 py-2 text-xs font-medium text-muted md:grid ${COLS}`}>
          <span>Item</span><span>{id === "daily" ? "Price per day or night" : "Price per unit"}</span><span className="text-right">Per person</span><span className="text-right">Total</span><span />
        </div>
        <ul className="divide-y divide-line">{lines.map(renderRow)}</ul>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-sea-50/60 px-4 py-2.5">
          <Plus className="h-4 w-4 text-sea-700" />
          <select aria-label={`Add ${id} item`} className="field h-9 w-auto" value="" onChange={(e) => e.target.value && addItem(e.target.value as never)}>
            <option value="">Add {id === "daily" ? "a daily" : "a trip"} item</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {id === "trip" && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Lock className="h-3.5 w-3.5" />
              <span>
                Places and activities come from the{" "}
                <button className="text-sea-700 underline underline-offset-2" onClick={onOpenItinerary}>Itinerary</button>.
              </span>
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section aria-label="Cost breakdown" className="flex flex-col gap-4">
      {empty && (
        <p className="rounded-xl bg-saffron-100 px-4 py-3 text-sm text-saffron-700">
          No prices yet. Pick a destination and choose <b>Fetch estimates</b> for typical prices, or type your own below.
        </p>
      )}

      {!empty && (
        <div>
          <div className="flex h-3 overflow-hidden rounded-full bg-sea-50" role="img" aria-label="Share of total cost by category">
            {CATEGORIES.map((c) => {
              const v = summary.categoryTotals[c.id] ?? 0;
              return v > 0 ? <div key={c.id} style={{ width: `${(v / summary.grandTotal) * 100}%`, background: CATEGORY_COLOR[c.id] }} title={`${c.label}: ${money(v)}`} /> : null;
            })}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {CATEGORIES.filter((c) => (summary.categoryTotals[c.id] ?? 0) > 0).map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[c.id] }} />
                <span className="truncate text-muted">{c.label}</span>
                <span className="num ml-auto text-right"><b className="font-semibold">{money((summary.categoryTotals[c.id] ?? 0) / people)}</b> <span className="text-xs text-muted">pp · {money(summary.categoryTotals[c.id] ?? 0)}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {renderSection("daily")}
      {renderSection("trip")}

      <div className="panel flex flex-wrap items-baseline justify-end gap-x-8 gap-y-1 px-4 py-3">
        <span className="text-sm text-muted">Per person <b className="display num text-xl text-sea-900" data-testid="per-person">{money(summary.perPerson)}</b></span>
        <span className="text-sm text-muted">Whole trip <b className="display num text-xl text-sea-900" data-testid="grand-total">{money(summary.grandTotal)}</b></span>
      </div>
    </section>
  );
}
