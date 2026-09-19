"use client";
import { ChevronDown, Download, FolderOpen, Loader2, Plane, RefreshCw, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createServices } from "@/services/container";
import { fileNameFor } from "@/services/storage/serialization";
import { useTripStore } from "@/store/tripStore";
import { CostTable } from "./CostTable";
import { Itinerary } from "./Itinerary";
import { ScenarioTable } from "./ScenarioTable";
import { TicketSummary } from "./TicketSummary";
import { TripForm } from "./TripForm";

const TABS = [
  { id: "costs", label: "Costs" },
  { id: "groups", label: "Traveler count" },
  { id: "itinerary", label: "Itinerary" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function Planner() {
  const services = useMemo(createServices, []);
  const { trip, pricing, refreshPrices, loadTrip, reset } = useTripStore();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabId>("costs");

  useEffect(() => {
    if (!message || busy) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message, busy]);

  const run = async (label: string, fn: () => Promise<string | void>) => {
    setBusy(true);
    setMessage(`${label}…`);
    try {
      setMessage((await fn()) || "");
    } catch (e) {
      setMessage(`${label} failed. ${e instanceof Error ? e.message : "Try again."}`);
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = () =>
    run("Creating PDF", async () => {
      const blob = await services.exporter.export(trip, 8);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameFor(trip).replace(/\.voyagr\.json$/, ".pdf");
      a.click();
      URL.revokeObjectURL(url);
      return "PDF downloaded";
    });

  const loading = pricing === "loading";
  const status = pricing === "error" ? "Couldn't fetch estimates. Enter prices by hand or try again." : message;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sea-700 text-white"><Plane className="h-5 w-5 -rotate-45" /></span>
            <h1 className="display text-xl font-bold text-sea-900">Voyagr-Go</h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button className="btn" onClick={reset}>New trip</button>
            <details className="relative">
              <summary className="btn cursor-pointer list-none [&::-webkit-details-marker]:hidden"><Save className="h-4 w-4" />Save or open<ChevronDown className="h-4 w-4" /></summary>
              <div className="panel absolute right-0 z-30 mt-2 w-64 p-1.5 shadow-lg">
                {services.storages.map((st) => (
                  <div key={st.name} className="p-1">
                    <div className="px-2 py-1 text-xs font-medium text-muted">{st.name}</div>
                    <button className="btn w-full justify-start border-0" onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); run(`Saving to ${st.name}`, async () => { await st.save(trip); return `Saved to ${st.name}`; }); }}>
                      <Save className="h-4 w-4" />Save here
                    </button>
                    <button className="btn w-full justify-start border-0" aria-label={`Open from ${st.name}`} onClick={(e) => { e.currentTarget.closest("details")?.removeAttribute("open"); run(`Opening from ${st.name}`, async () => { const t = await st.open(); if (t) { loadTrip(t); return `Opened ${t.name}`; } }); }}>
                      <FolderOpen className="h-4 w-4" />Open a trip
                    </button>
                  </div>
                ))}
              </div>
            </details>
            <button className="btn btn-primary" onClick={downloadPdf} disabled={busy}><Download className="h-4 w-4" />Download PDF</button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start"><TripForm /></aside>
        <div className="flex min-w-0 flex-col gap-5">
          <TicketSummary />
          <div className="flex flex-wrap items-center gap-3 border-b border-line">
            <div role="tablist" aria-label="Trip sections" className="flex">
              {TABS.map((t) => (
                <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} className="tab" onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>
            <button className="btn mb-2 ml-auto h-9" disabled={!trip.config.destination || loading} onClick={() => refreshPrices(services.priceClient)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : trip.config.destination ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              Fetch estimates
            </button>
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "costs" && <CostTable onOpenItinerary={() => setTab("itinerary")} />}
            {tab === "groups" && <ScenarioTable />}
            {tab === "itinerary" && <Itinerary />}
          </div>
        </div>
      </main>

      {status && (
        <div role="status" className="toast fixed bottom-6 left-1/2 z-40 max-w-[90vw] -translate-x-1/2 rounded-xl bg-sea-900 px-4 py-2.5 text-sm text-white shadow-lg">{status}</div>
      )}
    </div>
  );
}
