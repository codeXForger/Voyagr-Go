"use client";
import { AlertTriangle, LogIn, LogOut, Moon } from "lucide-react";
import { lodgingNotes } from "@/domain/stays";
import type { Stay, TripConfig } from "@/domain/types";

/** Small chips saying where you sleep on a day: checking out, checking in, staying on, or no hotel yet. */
export function LodgingTags({ stays, config, day }: { stays: Stay[]; config: Pick<TripConfig, "nights">; day: number }) {
  const notes = lodgingNotes(stays, config, day);
  if (notes.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={`Hotel on day ${day}`}>
      {notes.map((n, i) => {
        const name = n.stay ? n.stay.name.trim() || "Hotel" : "";
        const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium";
        if (n.kind === "none") return <li key={i} className={`${base} bg-saffron-100 text-saffron-700`}><AlertTriangle className="h-3.5 w-3.5" />No hotel for tonight</li>;
        if (n.kind === "checkout") return <li key={i} className={`${base} bg-sea-50 text-muted`}><LogOut className="h-3.5 w-3.5" />Check out: {name}</li>;
        if (n.kind === "checkin") return <li key={i} className={`${base} bg-sea-100 text-sea-900`}><LogIn className="h-3.5 w-3.5" />Check in: {name}</li>;
        return <li key={i} className={`${base} bg-sea-100 text-sea-900`}><Moon className="h-3.5 w-3.5" />Staying at {name}</li>;
      })}
    </ul>
  );
}
