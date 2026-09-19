import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createTrip, newActivity } from "@/domain/trip";
import type { PlaceStop } from "@/domain/types";
import { useTripStore } from "@/store/tripStore";
import { buildReport } from "@/services/export/report";
import { CostTable } from "./CostTable";
import { Itinerary } from "./Itinerary";

const day1 = () => useTripStore.getState().trip.itinerary[0];
const place = (name: string, over: Partial<PlaceStop> = {}): PlaceStop => ({ name, people: null, fee: 0, activities: [], ...over });
const setPlaces = (places: PlaceStop[]) => useTripStore.getState().updateDay(1, { places });

beforeEach(() => useTripStore.getState().loadTrip(createTrip({ destination: "Goa", days: 2, nights: 1, people: 4, currency: "USD" })));

describe("Itinerary places and their activities", () => {
  it("nests activities under places with the default price and people", () => {
    render(<Itinerary />);
    fireEvent.click(screen.getByLabelText("Add place to Day 1"));
    fireEvent.change(screen.getByLabelText("Day 1 place 1"), { target: { value: "Fort Aguada" } });
    fireEvent.click(screen.getByLabelText("Add activity to Day 1 place 1"));
    fireEvent.change(screen.getByLabelText("Day 1 place 1 activity 1"), { target: { value: "Cruise" } });
    expect(day1().places).toEqual([
      { name: "Fort Aguada", people: null, fee: 0, activities: [{ name: "Cruise", people: null, price: 500 }] },
    ]);
    expect(screen.getByLabelText("Day 1 place 1 people")).toHaveValue(4);
    expect(screen.getByLabelText("Day 1 place 1 entry fee per person")).toHaveValue(0);
    expect(screen.getByLabelText("Day 1 place 1 activity 1 people")).toHaveValue(4);
    expect(screen.getByLabelText("Day 1 place 1 activity 1 price per person")).toHaveValue(500);
  });

  it("lets place and activity people differ, and reset to the default", () => {
    setPlaces([place("Fort", { activities: [newActivity()] })]);
    render(<Itinerary />);
    fireEvent.change(screen.getByLabelText("Day 1 place 1 people"), { target: { value: "3" } });
    expect(day1().places[0].people).toBe(3);
    expect(screen.getByLabelText("Day 1 place 1 activity 1 people")).toHaveValue(3); // follows the place
    fireEvent.change(screen.getByLabelText("Day 1 place 1 activity 1 people"), { target: { value: "2" } });
    expect(day1().places[0].activities[0].people).toBe(2);
    fireEvent.click(screen.getByText("use same as place"));
    expect(day1().places[0].activities[0].people).toBeNull();
  });

  it("adds a place with Enter and removes rows", () => {
    render(<Itinerary />);
    fireEvent.click(screen.getByLabelText("Add place to Day 1"));
    fireEvent.change(screen.getByLabelText("Day 1 place 1"), { target: { value: "A" } });
    fireEvent.keyDown(screen.getByLabelText("Day 1 place 1"), { key: "Enter" });
    expect(day1().places).toHaveLength(2);
    fireEvent.click(screen.getByLabelText("Remove place 2 from Day 1"));
    expect(day1().places.map((p) => p.name)).toEqual(["A"]);
  });

  it("moves a place together with its activities when dragged", () => {
    setPlaces([place("A", { activities: [newActivity()] }), place("B"), place("C")]);
    render(<Itinerary />);
    fireEvent.dragStart(screen.getByLabelText(/^Reorder place 1\./));
    fireEvent.dragOver(screen.getByTestId("Day 1-row-2"));
    fireEvent.drop(screen.getByTestId("Day 1-row-2"));
    expect(day1().places.map((p) => p.name)).toEqual(["B", "C", "A"]);
    expect(day1().places[2].activities).toHaveLength(1);
  });

  it("reorders activities within their place only", () => {
    const a = (name: string) => ({ ...newActivity(), name });
    setPlaces([place("A", { activities: [a("x"), a("y")] }), place("B", { activities: [a("z")] })]);
    render(<Itinerary />);
    fireEvent.keyDown(screen.getAllByLabelText(/^Reorder activity 2\./)[0], { key: "ArrowUp" });
    expect(day1().places[0].activities.map((x) => x.name)).toEqual(["y", "x"]);
    expect(day1().places[1].activities.map((x) => x.name)).toEqual(["z"]);
  });

  it("keeps the hierarchy and cost details in the PDF report and drops blank rows", () => {
    setPlaces([
      place("Fort", { fee: 100, activities: [{ name: "Tour", people: 2, price: 300 }, { ...newActivity(), name: "  " }] }),
      place(""),
      place("", { activities: [{ name: "Swim", people: null, price: 500 }] }),
    ]);
    const r = buildReport(useTripStore.getState().trip, 2);
    expect(r.itinerary[0].places).toHaveLength(2);
    expect(r.itinerary[0].places[0]).toMatchObject({ name: "Fort", activities: [{ name: "Tour" }] });
    expect(r.itinerary[0].places[0].detail).toContain("4 people");
    expect(r.itinerary[0].places[0].activities[0].detail).toContain("2 people");
    expect(r.itinerary[0].places[1].name).toBe("Other");
  });
});

describe("Itinerary and Costs stay linked", () => {
  const costs = () => screen.getByRole("group", { name: "Trip charges" });

  it("shows no activity or place costs until they are added in the itinerary", () => {
    render(<CostTable />);
    expect(costs().querySelector('[data-testid="row-activities"]')).toBeNull();
    expect(costs().querySelector('[data-testid="row-places"]')).toBeNull();
  });

  it("adds cost rows for new places and activities, locked so they can't be deleted from Costs", () => {
    render(<><Itinerary /><CostTable /></>);
    fireEvent.click(screen.getByLabelText("Add place to Day 1"));
    fireEvent.change(screen.getByLabelText("Day 1 place 1"), { target: { value: "Fort" } });
    fireEvent.click(screen.getByLabelText("Add activity to Day 1 place 1"));
    fireEvent.change(screen.getByLabelText("Day 1 place 1 activity 1"), { target: { value: "Cruise" } });

    const activityRow = within(costs()).getByTestId("row-activities");
    expect(activityRow).toHaveTextContent("Cruise");
    expect(activityRow).toHaveTextContent("4 people");
    expect(activityRow).toHaveTextContent("$2,000.00"); // 4 x 500
    expect(within(activityRow).queryByLabelText(/^Remove/)).toBeNull();
    expect(within(activityRow).getByLabelText(/managed in the itinerary/)).toBeInTheDocument();
    expect(within(costs()).getByTestId("row-places")).toHaveTextContent("Fort entry");
    expect(within(costs()).getByTestId("row-places")).toBeInTheDocument();
  });

  it("edits linked prices from Costs and removes the cost when the itinerary row is removed", () => {
    setPlaces([place("Fort", { activities: [newActivity()] })]);
    render(<><Itinerary /><CostTable /></>);
    fireEvent.change(screen.getByLabelText("Untitled activity price"), { target: { value: "800" } });
    expect(day1().places[0].activities[0].price).toBe(800);
    expect(screen.getByLabelText("Day 1 place 1 activity 1 price per person")).toHaveValue(800);

    fireEvent.click(screen.getByLabelText("Remove activity 1 from Day 1 place 1"));
    expect(costs().querySelector('[data-testid="row-activities"]')).toBeNull();
    fireEvent.click(screen.getByLabelText("Remove place 1 from Day 1"));
    expect(costs().querySelector('[data-testid="row-places"]')).toBeNull();
  });

  it("changes the total when people in an activity change", () => {
    setPlaces([place("Fort", { activities: [newActivity()] })]);
    render(<><Itinerary /><CostTable /></>);
    fireEvent.change(screen.getByLabelText("Day 1 place 1 activity 1 people"), { target: { value: "1" } });
    expect(screen.getByTestId("row-activities")).toHaveTextContent("$500.00");
  });
});
