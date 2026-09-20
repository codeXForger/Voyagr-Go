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
      { name: "Fort Aguada", time: "", transferIn: null, people: null, fee: 0, parking: 0, activities: [{ name: "Cruise", time: "", people: null, price: 500 }] },
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

describe("Transfers and timeline", () => {
  const costs = () => screen.getByRole("group", { name: "Trip charges" });

  it("adds a transfer above a place, prices it, and it appears (locked) in Costs", () => {
    setPlaces([place("Airport"), place("Hotel")]);
    render(<><Itinerary /><CostTable /></>);
    fireEvent.click(screen.getByLabelText("Add transfer to Day 1 place 2"));
    expect(screen.getByLabelText("Day 1 place 2 transfer from")).toHaveAttribute("placeholder", "Airport");
    fireEvent.change(screen.getByLabelText("Day 1 place 2 transfer cost"), { target: { value: "800" } });
    expect(day1().places[1].transferIn).toMatchObject({ mode: "cab", cost: 800, billing: "group" });

    const row = within(costs()).getByTestId("row-transfers");
    expect(row).toHaveTextContent("Cab: Airport to Hotel");
    expect(row).toHaveTextContent("one price for the group");
    expect(row).toHaveTextContent("$800.00");
    expect(within(row).queryByLabelText(/^Remove/)).toBeNull();
    expect(within(row).getByLabelText(/managed in the itinerary/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Remove transfer to Day 1 place 2"));
    expect(costs().querySelector('[data-testid="row-transfers"]')).toBeNull();
  });

  it("switching to ferry bills per person and lets you choose how many", () => {
    setPlaces([place("Jetty"), place("Island")]);
    render(<Itinerary />);
    fireEvent.click(screen.getByLabelText("Add transfer to Day 1 place 2"));
    fireEvent.change(screen.getByLabelText("Day 1 place 2 transfer mode"), { target: { value: "ferry" } });
    expect(day1().places[1].transferIn?.billing).toBe("perPerson");
    fireEvent.change(screen.getByLabelText("Day 1 place 2 transfer people"), { target: { value: "2" } });
    expect(day1().places[1].transferIn?.people).toBe(2);
  });

  it("accepts optional times on places, activities and transfers", () => {
    setPlaces([place("Fort"), place("Beach")]);
    render(<Itinerary />);
    fireEvent.change(screen.getByLabelText("Day 1 place 1 time"), { target: { value: "09:30" } });
    expect(day1().places[0].time).toBe("09:30");
    fireEvent.click(screen.getByLabelText("Add transfer to Day 1 place 2"));
    fireEvent.change(screen.getByLabelText("Day 1 place 2 transfer time"), { target: { value: "12:00" } });
    expect(day1().places[1].transferIn?.time).toBe("12:00");
  });

  it("shows the day as a timeline in order, with times and costs", () => {
    const cab = { mode: "cab" as const, from: "", cost: 800, billing: "group" as const, people: null, time: "10:00" };
    const ferry = { mode: "ferry" as const, from: "", cost: 150, billing: "perPerson" as const, people: null, time: "" };
    setPlaces([
      place("Airport"),
      place("Hotel", { transferIn: cab, time: "10:45" }),
      place("Island", { transferIn: ferry, fee: 200 }),
    ]);
    useTripStore.getState().updateDay(1, { places: [
      ...day1().places.slice(0, 2),
      { ...day1().places[2], activities: [{ name: "Snorkeling", time: "15:00", people: null, price: 500 }] },
    ] });
    render(<Itinerary />);
    fireEvent.click(screen.getByRole("button", { name: "timeline" }));
    const tl = screen.getByRole("list", { name: "Timeline" });
    expect(within(tl).getByTestId("stop-1-1")).toHaveTextContent("10:45");
    expect(within(tl).getByTestId("transfer-1-1")).toHaveTextContent("Cab · Airport to Hotel · $800.00 total");
    expect(within(tl).getByTestId("transfer-1-1")).toHaveTextContent("10:00");
    expect(within(tl).getByTestId("transfer-1-2")).toHaveTextContent("$150.00 × 4");
    expect(within(tl).getByTestId("stop-1-2")).toHaveTextContent("Entry $200.00 × 4");
    expect(within(tl).getByTestId("activity-1-2-0")).toHaveTextContent("15:00");
    expect(within(tl).getByTestId("activity-1-2-0")).toHaveTextContent("Snorkeling");
    const html = tl.innerHTML;
    expect(html.indexOf("Airport")).toBeLessThan(html.indexOf("Hotel"));
    expect(html.indexOf("Hotel")).toBeLessThan(html.indexOf("Island"));
    expect(tl).toHaveTextContent("Day cost"); // 800 + 600 + 800 + 2000
    expect(tl).toHaveTextContent("$4,200.00");
    fireEvent.click(screen.getByRole("button", { name: "edit" }));
  });

  it("puts transfers and times in the PDF report", () => {
    const cab = { mode: "cab" as const, from: "Airport", cost: 800, billing: "group" as const, people: null, time: "10:00" };
    setPlaces([place("Hotel", { transferIn: cab, time: "10:45" })]);
    const r = buildReport(useTripStore.getState().trip, 2);
    expect(r.itinerary[0].places[0]).toMatchObject({ name: "Hotel", time: "10:45" });
    expect(r.itinerary[0].places[0].transfer).toMatchObject({ text: "Cab from Airport to Hotel", time: "10:00" });
    expect(r.itinerary[0].places[0].transfer?.detail).toContain("800");
    expect(r.itinerary[0].dayCost).toContain("800");
  });
});

describe("Parking", () => {
  const costs = () => screen.getByRole("group", { name: "Trip charges" });

  it("is an optional field on each place, 0 by default, with no cost row until you enter a price", () => {
    setPlaces([place("Fort Aguada")]);
    render(<><Itinerary /><CostTable /></>);
    expect(screen.getByLabelText("Day 1 place 1 parking")).toHaveValue(0);
    expect(costs().querySelector('[data-testid="row-parking"]')).toBeNull();

    fireEvent.change(screen.getByLabelText("Day 1 place 1 parking"), { target: { value: "150" } });
    expect(day1().places[0].parking).toBe(150);
    const row = within(costs()).getByTestId("row-parking");
    expect(row).toHaveTextContent("Fort Aguada parking");
    expect(row).toHaveTextContent("one price for the group");
    expect(row).toHaveTextContent("$150.00"); // group price, not multiplied by people
    expect(within(row).queryByLabelText(/^Remove/)).toBeNull();
    expect(within(row).getByLabelText(/managed in the itinerary/)).toBeInTheDocument();
  });

  it("can be edited from Costs, and setting it back to 0 removes the row", () => {
    setPlaces([place("Fort Aguada", { parking: 150 })]);
    render(<><Itinerary /><CostTable /></>);
    fireEvent.change(screen.getByLabelText("Fort Aguada parking price"), { target: { value: "200" } });
    expect(day1().places[0].parking).toBe(200);
    expect(screen.getByLabelText("Day 1 place 1 parking")).toHaveValue(200);
    fireEvent.change(screen.getByLabelText("Day 1 place 1 parking"), { target: { value: "0" } });
    expect(costs().querySelector('[data-testid="row-parking"]')).toBeNull();
  });

  it("shows on the timeline and in the PDF report", () => {
    setPlaces([place("Fort Aguada", { fee: 100, parking: 150 })]);
    render(<Itinerary />);
    fireEvent.click(screen.getByRole("button", { name: "timeline" }));
    expect(screen.getByTestId("stop-1-0")).toHaveTextContent("Parking $150.00");
    const r = buildReport(useTripStore.getState().trip, 2);
    expect(r.itinerary[0].places[0].detail).toContain("parking");
    expect(r.itinerary[0].places[0].detail).toContain("150");
  });

  it("is left out of the report when there is none", () => {
    setPlaces([place("Fort Aguada")]);
    expect(buildReport(useTripStore.getState().trip, 2).itinerary[0].places[0].detail).not.toContain("parking");
  });
});
