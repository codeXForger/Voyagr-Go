import { getCategory, SECTIONS, type IconKey } from "@/domain/categories";
import { formatMoney } from "@/domain/format";
import { dayDate, formatRange, formatWeekday } from "@/domain/dates";
import { activityPeople, placePeople } from "@/domain/itineraryCosts";
import { round2, scenarioTable, summarize } from "@/domain/pricing";
import type { Trip } from "@/domain/types";

export interface ReportCostRow {
  icon: IconKey;
  category: string;
  label: string;
  unitPrice: string;
  quantity: number;
  perPerson: string;
  total: string;
}

export interface Report {
  title: string;
  subtitle: string;
  itinerary: {
    title: string;
    date: string;
    places: { name: string; detail: string; activities: { name: string; detail: string }[] }[];
    notes: string;
  }[];
  costRows: ReportCostRow[];
  costSections: { title: string; rows: ReportCostRow[]; total: string; perDay?: string; perPersonPerDay?: string }[];
  categoryTotals: { icon: IconKey; label: string; total: string }[];
  grandTotal: string;
  perPerson: string;
  scenarios: { people: number; rooms: number; total: string; perPerson: string }[];
}

/** Pure view-model shared by any exporter, so formatting is testable without a PDF engine. */
export function buildReport(trip: Trip, maxScenarioPeople: number): Report {
  const { config } = trip;
  const money = (n: number) => formatMoney(n, config.currency, "code");
  const summary = summarize(trip);
  const route = config.origin ? `${config.origin} to ${config.destination}` : config.destination;
  const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  const costRows: (ReportCostRow & { section: string })[] = summary.lines.map((l) => {
    const cat = getCategory(l.item.category);
    return {
      section: cat.section,
      icon: cat.icon,
      category: cat.label,
      label: l.item.label,
      unitPrice: money(l.unitPrice),
      quantity: l.quantity,
      perPerson: money(l.perPerson),
      total: money(l.total),
    };
  });
  const costSections = SECTIONS.map((sec) => {
    const lines = summary.lines.filter((l) => getCategory(l.item.category).section === sec.id);
    const total = round2(lines.reduce((s, l) => s + l.total, 0));
    const daily = sec.id === "daily" && config.days > 0;
    return {
      title: sec.title,
      rows: costRows.filter((r) => r.section === sec.id),
      total: money(total),
      perDay: daily ? money(round2(total / config.days)) : undefined,
      perPersonPerDay: daily && config.people > 0 ? money(round2(total / config.days / config.people)) : undefined,
    };
  });

  return {
    title: trip.name,
    subtitle: [
      route,
      formatRange(config) || null,
      `${config.days} days / ${config.nights} nights`,
      plural(config.people, "traveler"),
      plural(config.rooms, "room"),
      config.extraBeds ? plural(config.extraBeds, "extra bed") : null,
    ].filter(Boolean).join("  |  "),
    itinerary: trip.itinerary.map((d) => ({
      title: d.title,
      date: dayDate(config, d.day) ? formatWeekday(dayDate(config, d.day)) : "",
      places: d.places
        .map((p) => ({ place: p, name: p.name.trim(), activities: p.activities.filter((a) => a.name.trim()) }))
        .filter((p) => p.name || p.activities.length)
        .map(({ place, name, activities }) => {
          const n = placePeople(place, config);
          return {
            name: name || "Other",
            detail: place.fee > 0 ? `${people(n)} x ${money(place.fee)} entry = ${money(n * place.fee)}` : `${people(n)}, no entry fee`,
            activities: activities.map((a) => {
              const an = activityPeople(a, place, config);
              return { name: a.name.trim(), detail: `${people(an)} x ${money(a.price)} = ${money(an * a.price)}` };
            }),
          };
        }),
      notes: d.notes,
    })),
    costRows,
    costSections,
    categoryTotals: Object.entries(summary.categoryTotals).map(([id, total]) => {
      const cat = getCategory(id as never);
      return { icon: cat.icon, label: cat.label, total: money(total ?? 0) };
    }),
    grandTotal: money(summary.grandTotal),
    perPerson: money(summary.perPerson),
    scenarios: scenarioTable(trip, maxScenarioPeople).map((r) => ({
      people: r.people,
      rooms: r.rooms,
      total: money(r.total),
      perPerson: money(r.perPerson),
    })),
  };
}
