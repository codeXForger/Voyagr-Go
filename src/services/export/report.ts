import { getCategory, SECTIONS, type IconKey } from "@/domain/categories";
import { CATEGORY_COLOR, STAY_COLORS } from "@/domain/colors";
import { formatMoney } from "@/domain/format";
import { dayDate, formatRange, formatWeekday } from "@/domain/dates";
import { activityPeople, dayCost, placePeople, transferPeople } from "@/domain/itineraryCosts";
import { modeOf, transferFrom } from "@/domain/transfers";
import { hotelNames, lodgingNotes, stayNights, stayRangeText, stayRooms, stayTotal } from "@/domain/stays";
import { round2, scenarioTable, summarize } from "@/domain/pricing";
import type { Trip } from "@/domain/types";

export interface ReportCostRow {
  icon: IconKey;
  category: string;
  label: string;
  /** Where the row comes from, e.g. "Day 1 · at Fort Aguada · per person · 4 people". */
  note: string;
  color: string;
  unitPrice: string;
  quantity: number;
  perPerson: string;
  total: string;
}

export interface Report {
  brand: string;
  generatedOn: string;
  title: string;
  subtitle: string;
  cover: {
    from: string;
    to: string;
    dates: string;
    /** Short facts shown as chips: length, travelers, hotels. */
    chips: string[];
  };
  people: number;
  days: number;
  nights: number;
  /** Hotels in check-in order. */
  stays: { name: string; color: string; range: string; detail: string; total: string }[];
  itinerary: {
    day: number;
    title: string;
    date: string;
    /** Hotel notes for the day: check in/out, where you sleep, or a missing hotel. */
    lodging: string[];
    hotelNames: string[];
    /** Empty when the day has no itinerary costs. */
    dayCost: string;
    places: {
      name: string;
      time: string;
      detail: string;
      /** How you get here from the previous stop. */
      transfer?: { text: string; detail: string; time: string };
      activities: { name: string; time: string; detail: string }[];
    }[];
    notes: string;
  }[];
  costRows: ReportCostRow[];
  costSections: { title: string; rows: ReportCostRow[]; total: string; perDay?: string; perPersonPerDay?: string }[];
  categoryTotals: { icon: IconKey; label: string; color: string; total: string; perPerson: string; share: number }[];
  disclaimer: string;
  grandTotal: string;
  perPerson: string;
  scenarios: { people: number; rooms: number; total: string; perPerson: string }[];
}

/** Pure view-model shared by any exporter, so formatting is testable without a PDF engine. */
export function buildReport(trip: Trip, maxScenarioPeople: number, now: Date = new Date()): Report {
  const { config } = trip;
  const money = (n: number) => formatMoney(n, config.currency, "code");
  const summary = summarize(trip);
  const route = config.origin ? `${config.origin} to ${config.destination}` : config.destination;
  const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  // Free entry fees and activities from the itinerary are left out of the tables (they are still on the itinerary pages).
  const costRows: (ReportCostRow & { section: string })[] = summary.lines.filter((l) => !(l.item.link && l.total === 0)).map((l) => {
    const cat = getCategory(l.item.category);
    return {
      section: cat.section,
      icon: l.item.icon ?? cat.icon,
      category: cat.label,
      color: CATEGORY_COLOR[l.item.category],
      note: l.item.note ?? `${cat.unitLabel} · quantity ${l.quantity}`,
      label: l.item.label,
      unitPrice: money(l.unitPrice),
      quantity: l.quantity,
      perPerson: money(l.perPerson),
      total: money(l.total),
    };
  });
  const costSections = SECTIONS.map((sec) => {
    const lines = summary.lines.filter((l) => getCategory(l.item.category).section === sec.id && !(l.item.link && l.total === 0));
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

  const hotels = hotelNames(trip.stays);

  return {
    brand: "Voyagr-Go",
    generatedOn: now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    title: trip.name,
    cover: {
      from: config.origin.trim(),
      to: config.destination.trim(),
      dates: formatRange(config),
      chips: [
        `${config.days} ${config.days === 1 ? "day" : "days"}, ${config.nights} ${config.nights === 1 ? "night" : "nights"}`,
        plural(config.people, "traveler"),
        ...(trip.stays.length ? [plural(trip.stays.length, "hotel")] : []),
      ],
    },
    people: config.people,
    days: config.days,
    nights: config.nights,
    disclaimer: "Prices are estimates for planning and may change. Check every price before you book.",
    subtitle: [
      route,
      formatRange(config) || null,
      `${config.days} days / ${config.nights} nights`,
      plural(config.people, "traveler"),
      trip.stays.length ? plural(trip.stays.length, "hotel") : null,
    ].filter(Boolean).join("  |  "),
    stays: trip.stays
      .filter((s) => stayNights(s, config) > 0)
      .map((s) => {
        const rooms = stayRooms(s, config);
        const n = stayNights(s, config);
        const totals = stayTotal(s, config);
        return {
          name: s.name.trim() || "Hotel",
          color: STAY_COLORS[trip.stays.indexOf(s) % STAY_COLORS.length],
          range: config.startDate && dayDate(config, s.checkIn)
            ? `${formatWeekday(dayDate(config, s.checkIn))} to ${formatWeekday(dayDate(config, s.checkIn + n))} (${n} ${n === 1 ? "night" : "nights"})`
            : stayRangeText(s, config),
          detail:
            `${plural(rooms, "room")} x ${n} ${n === 1 ? "night" : "nights"} x ${money(s.roomPrice)}, ${s.guestsPerRoom} per room` +
            (s.extraBeds > 0 ? `; ${plural(s.extraBeds, "extra bed")} x ${money(s.extraBedPrice)}` : ""),
          total: money(totals.total),
        };
      }),
    itinerary: trip.itinerary.map((d) => ({
      day: d.day,
      title: d.title,
      hotelNames: hotels,
      lodging: lodgingNotes(trip.stays, config, d.day).map((n) => {
        const name = n.stay?.name.trim() || "Hotel";
        return n.kind === "checkout" ? `Check out of ${name}` : n.kind === "checkin" ? `Check in to ${name}` : n.kind === "stay" ? `Staying at ${name}` : "No hotel booked for tonight";
      }),
      date: dayDate(config, d.day) ? formatWeekday(dayDate(config, d.day)) : "",
      dayCost: dayCost(trip.itinerary, config, d.day) > 0 ? money(dayCost(trip.itinerary, config, d.day)) : "",
      places: d.places
        .map((p, index) => ({ place: p, index, name: p.name.trim(), activities: p.activities.filter((a) => a.name.trim()) }))
        .filter((p) => p.name || p.activities.length || p.place.transferIn)
        .map(({ place, index, name, activities }) => {
          const n = placePeople(place, config);
          const t = place.transferIn;
          return {
            name: name || "Other",
            time: place.time ?? "",
            transfer: t
              ? {
                  text: `${modeOf(t.mode).label} from ${transferFrom(t, index > 0 ? d.places[index - 1].name : undefined)} to ${name || "next stop"}`,
                  detail: t.billing === "perPerson" ? `${people(transferPeople(t, config))} x ${money(t.cost)} = ${money(transferPeople(t, config) * t.cost)}` : `${money(t.cost)} for the group`,
                  time: t.time,
                }
              : undefined,
            detail:
              (place.fee > 0 ? `${people(n)} x ${money(place.fee)} entry = ${money(n * place.fee)}` : `${people(n)}, no entry fee`) +
              ((place.parking ?? 0) > 0 ? `; parking ${money(place.parking ?? 0)}` : ""),
            activities: activities.map((a) => {
              const an = activityPeople(a, place, config);
              return { name: a.name.trim(), time: a.time ?? "", detail: a.price > 0 ? `${people(an)} x ${money(a.price)} = ${money(an * a.price)}` : `${people(an)}, no charge` };
            }),
          };
        }),
      notes: d.notes,
    })),
    costRows,
    costSections,
    categoryTotals: Object.entries(summary.categoryTotals).map(([id, total]) => {
      const cat = getCategory(id as never);
      const t = total ?? 0;
      return {
        icon: cat.icon,
        label: cat.label,
        color: CATEGORY_COLOR[id as keyof typeof CATEGORY_COLOR],
        total: money(t),
        perPerson: money(config.people > 0 ? round2(t / config.people) : 0),
        share: summary.grandTotal > 0 ? t / summary.grandTotal : 0,
      };
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
