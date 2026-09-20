import { modeOf, transferFrom } from "./transfers";
import type { ActivityStop, CostItem, DayPlan, ItemLink, PlaceStop, Transfer, TripConfig } from "./types";

export const placePeople = (place: PlaceStop, config: TripConfig) => place.people ?? config.people;

export const activityPeople = (activity: ActivityStop, place: PlaceStop, config: TripConfig) =>
  activity.people ?? placePeople(place, config);

/** People a per-person transfer is billed for (everyone unless set). */
export const transferPeople = (t: Transfer, config: TripConfig) => t.people ?? config.people;

const peopleText = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

/**
 * Cost lines owned by the itinerary: each place contributes its entry fee and each
 * activity its price, both per person. They are derived (never stored), so adding or
 * removing an itinerary row adds or removes its cost line automatically.
 */
export function itineraryItems(itinerary: DayPlan[], config: TripConfig): CostItem[] {
  const items: CostItem[] = [];
  for (const d of itinerary) {
    d.places.forEach((place, pi) => {
      const placeName = place.name.trim() || "Untitled place";
      const t = place.transferIn;
      if (t) {
        const mode = modeOf(t.mode);
        const perPerson = t.billing === "perPerson";
        const n = transferPeople(t, config);
        const from = transferFrom(t, pi > 0 ? d.places[pi - 1].name : undefined);
        items.push({
          id: `link-d${d.day}-p${pi}-t`,
          category: "transfers",
          label: `${mode.label}: ${from} to ${placeName}`,
          unitPrice: t.cost,
          basis: "flat",
          count: perPerson ? n : 1,
          overridden: false,
          link: { day: d.day, place: pi, transfer: true },
          icon: mode.icon,
          note: `Day ${d.day} · ${perPerson ? `per person · ${peopleText(n)}` : "one price for the group"}`,
        });
      }
      const pn = placePeople(place, config);
      items.push({
        id: `link-d${d.day}-p${pi}`,
        category: "places",
        label: `${placeName} entry`,
        unitPrice: place.fee,
        basis: "flat",
        count: pn,
        overridden: false,
        link: { day: d.day, place: pi },
        note: `Day ${d.day} · per person · ${peopleText(pn)}`,
      });
      if ((place.parking ?? 0) > 0) {
        items.push({
          id: `link-d${d.day}-p${pi}-k`,
          category: "parking",
          label: `${placeName} parking`,
          unitPrice: place.parking ?? 0,
          basis: "flat",
          count: 1,
          overridden: false,
          link: { day: d.day, place: pi, parking: true },
          note: `Day ${d.day} · one price for the group`,
        });
      }
      place.activities.forEach((activity, ai) => {
        const an = activityPeople(activity, place, config);
        items.push({
          id: `link-d${d.day}-p${pi}-a${ai}`,
          category: "activities",
          label: activity.name.trim() || "Untitled activity",
          unitPrice: activity.price,
          basis: "flat",
          count: an,
          overridden: false,
          link: { day: d.day, place: pi, activity: ai },
          note: `Day ${d.day} · at ${placeName} · per person · ${peopleText(an)}`,
        });
      });
    });
  }
  return items;
}

/** Total of everything the itinerary charges on one day (entry fees, activities, transfers). */
export function dayCost(itinerary: DayPlan[], config: TripConfig, day: number): number {
  const total = itineraryItems(itinerary, config)
    .filter((i) => i.link?.day === day)
    .reduce((sum, i) => sum + i.unitPrice * i.count, 0);
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

/** Returns a copy of the itinerary with the price of the linked place or activity changed. */
export function withLinkedPrice(itinerary: DayPlan[], link: ItemLink, price: number): DayPlan[] {
  const value = Math.max(0, Number.isFinite(price) ? price : 0);
  return itinerary.map((d) =>
    d.day !== link.day
      ? d
      : {
          ...d,
          places: d.places.map((p, pi) => {
            if (pi !== link.place) return p;
            if (link.parking) return { ...p, parking: value };
            if (link.transfer) return p.transferIn ? { ...p, transferIn: { ...p.transferIn, cost: value } } : p;
            if (link.activity === undefined) return { ...p, fee: value };
            return { ...p, activities: p.activities.map((a, ai) => (ai === link.activity ? { ...a, price: value } : a)) };
          }),
        },
  );
}
