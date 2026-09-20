"use client";
import { Plus, X } from "lucide-react";
import { MODES, modeOf, newTransfer, transferFrom, withMode } from "@/domain/transfers";
import { transferPeople } from "@/domain/itineraryCosts";
import type { Transfer, TransferMode, TripConfig } from "@/domain/types";
import { IconBadge } from "./IconBadge";
import { SuggestInput, type SuggestGroup } from "./SuggestInput";
import { NumField } from "./NumField";

interface Props {
  /** Accessible-name prefix, e.g. "Day 1 place 2". */
  name: string;
  transfer: Transfer | null | undefined;
  previousPlace?: string;
  /** Where you might start from: your hotels and the other places today. */
  fromSuggestions?: SuggestGroup[];
  placeName: string;
  config: TripConfig;
  symbol: string;
  onChange(t: Transfer | null): void;
}

/** The connector shown above a place: how you get there from the previous stop, and what it costs. */
export function TransferEditor({ name, transfer: t, previousPlace, fromSuggestions = [], placeName, config, symbol, onChange }: Props) {
  if (!t) {
    return (
      <button type="button" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-sea-700 hover:bg-sea-50" aria-label={`Add transfer to ${name}`} onClick={() => onChange(newTransfer())}>
        <Plus className="h-3.5 w-3.5" />Add transfer to get here
      </button>
    );
  }
  const mode = modeOf(t.mode);
  const set = (patch: Partial<Transfer>) => onChange({ ...t, ...patch });
  const n = transferPeople(t, config);

  return (
    <div className="rounded-lg border border-dashed border-sea-500/40 bg-sea-50/70 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-sea-700 text-white"><IconBadge name={mode.icon} className="h-4 w-4" /></span>
        <select aria-label={`${name} transfer mode`} className="field h-8 w-auto text-xs" value={t.mode} onChange={(e) => onChange(withMode(t, e.target.value as TransferMode))}>
          {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted">
          From
          <SuggestInput label={`${name} transfer from`} className="field h-8 w-full min-w-24 text-xs" value={t.from} placeholder={previousPlace?.trim() || "Start"} groups={fromSuggestions} onChange={(from) => set({ from })} />
        </label>
        <span className="hidden text-xs text-muted sm:inline">to <b className="font-medium text-ink">{placeName.trim() || "this place"}</b></span>
        <button type="button" className="icon-btn ml-auto h-7 w-7" aria-label={`Remove transfer to ${name}`} onClick={() => onChange(null)}><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <label className="flex items-center gap-2">
          Cost
          <span className="w-28"><NumField compact prefix={symbol} step={50} label={`${name} transfer cost`} value={t.cost} onChange={(cost) => set({ cost: Math.max(0, cost) })} /></span>
        </label>
        <select aria-label={`${name} transfer billing`} className="field h-8 w-auto text-xs" value={t.billing} onChange={(e) => set({ billing: e.target.value as Transfer["billing"] })}>
          <option value="group">One price for the group</option>
          <option value="perPerson">Per person</option>
        </select>
        {t.billing === "perPerson" && (
          <label className="flex items-center gap-2">
            People
            <span className="w-16"><NumField compact label={`${name} transfer people`} value={n} onChange={(p) => set({ people: Math.max(0, Math.floor(p)) })} /></span>
            {t.people !== null && <button type="button" className="text-sea-700 underline underline-offset-2" onClick={() => set({ people: null })}>use everyone</button>}
          </label>
        )}
        <label className="flex items-center gap-2">
          Time
          <input type="time" aria-label={`${name} transfer time`} className="field h-8 w-28 text-xs" value={t.time} onChange={(e) => set({ time: e.target.value })} />
        </label>
      </div>
      <span className="sr-only">{transferFrom(t, previousPlace)}</span>
    </div>
  );
}
