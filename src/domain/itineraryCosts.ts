import type { ActivityStop, CostItem, DayPlan, ItemLink, PlaceStop, TripConfig } from "./types";

export const placePeople = (place: PlaceStop, config: TripConfig) => place.people ?? config.people;

export const activityPeople = (activity: ActivityStop, place: PlaceStop, config: TripConfig) =>
  activity.people ?? placePeople(place, config);

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
      items.push({
        id: `link-d${d.day}-p${pi}`,
        category: "places",
        label: `${placeName} entry`,
        unitPrice: place.fee,
        basis: "flat",
        count: placePeople(place, config),
        overridden: false,
        link: { day: d.day, place: pi },
        note: `Day ${d.day}`,
      });
      place.activities.forEach((activity, ai) => {
        items.push({
          id: `link-d${d.day}-p${pi}-a${ai}`,
          category: "activities",
          label: activity.name.trim() || "Untitled activity",
          unitPrice: activity.price,
          basis: "flat",
          count: activityPeople(activity, place, config),
          overridden: false,
          link: { day: d.day, place: pi, activity: ai },
          note: `Day ${d.day} · at ${placeName}`,
        });
      });
    });
  }
  return items;
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
            if (link.activity === undefined) return { ...p, fee: value };
            return { ...p, activities: p.activities.map((a, ai) => (ai === link.activity ? { ...a, price: value } : a)) };
          }),
        },
  );
}
