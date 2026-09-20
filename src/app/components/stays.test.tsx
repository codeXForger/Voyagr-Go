import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createTrip } from "@/domain/trip";
import { buildReport } from "@/services/export/report";
import { useTripStore } from "@/store/tripStore";
import { CostTable } from "./CostTable";
import { Itinerary } from "./Itinerary";
import { StaysEditor } from "./StaysEditor";

const state = () => useTripStore.getState();
const daily = () => screen.getByRole("group", { name: "Daily charges" });

// 4 people, 4 days / 3 nights, USD
beforeEach(() => state().loadTrip(createTrip({ destination: "Goa", days: 4, nights: 3, people: 4, currency: "USD" })));

describe("Where you'll stay", () => {
  it("starts empty with a clear prompt, and adds a hotel covering all nights", () => {
    render(<StaysEditor />);
    expect(screen.getByText(/No hotels yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Add your first hotel/ }));
    expect(state().trip.stays).toHaveLength(1);
    expect(state().trip.stays[0]).toMatchObject({ checkIn: 1, nights: 3, guestsPerRoom: 2, rooms: null });
    expect(screen.getByLabelText("Hotel 1 rooms")).toHaveValue(2); // 4 people / 2 per room
    expect(screen.getByText(/Auto: enough for 4 people/)).toBeInTheDocument();
  });

  it("enters price, people per room, rooms and extra beds, and shows the hotel total", () => {
    render(<StaysEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Add hotel" }));
    fireEvent.change(screen.getByLabelText("Hotel 1 name"), { target: { value: "Sea View" } });
    fireEvent.change(screen.getByLabelText("Hotel 1 price per room"), { target: { value: "3500" } });
    fireEvent.change(screen.getByLabelText("Hotel 1 guests per room"), { target: { value: "4" } });
    expect(screen.getByLabelText("Hotel 1 rooms")).toHaveValue(1); // auto follows people per room
    fireEvent.change(screen.getByLabelText("Hotel 1 extra beds"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Hotel 1 price per extra bed"), { target: { value: "900" } });
    expect(state().trip.stays[0]).toMatchObject({ name: "Sea View", roomPrice: 3500, guestsPerRoom: 4, extraBeds: 1, extraBedPrice: 900 });
    // 1 room x 3 nights x 3500 = 10,500, 1 bed x 3 nights x 900 = 2,700
    expect(screen.getByText(/Hotel total \$13,200\.00/)).toBeInTheDocument();
  });

  it("can set an exact number of rooms and go back to automatic", () => {
    state().addStay();
    render(<StaysEditor />);
    fireEvent.change(screen.getByLabelText("Hotel 1 rooms"), { target: { value: "3" } });
    expect(state().trip.stays[0].rooms).toBe(3);
    fireEvent.click(screen.getByText("use auto"));
    expect(state().trip.stays[0].rooms).toBeNull();
  });

  it("splits the trip across hotels: 2 nights in one, then a new one", () => {
    render(<StaysEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Add hotel" }));
    fireEvent.change(screen.getByLabelText("Hotel 1 check out"), { target: { value: "3" } }); // check out on day 3 = 2 nights
    expect(state().trip.stays[0]).toMatchObject({ checkIn: 1, nights: 2 });
    expect(screen.getByText(/No hotel for night 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add hotel" })); // fills the gap
    expect(state().trip.stays[1]).toMatchObject({ checkIn: 3, nights: 1, name: "Hotel 2" });
    expect(screen.queryByText(/No hotel for/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Hotel 2 check in")).toHaveValue("3");
  });

  it("adds a hotel straight from a gap in the night strip", () => {
    state().addStay({ checkIn: 1, nights: 1 });
    render(<StaysEditor />);
    fireEvent.click(screen.getByTitle("Add a hotel for these nights"));
    expect(state().trip.stays[1]).toMatchObject({ checkIn: 2, nights: 2 });
  });

  it("shows dates on check-in and check-out choices when the trip has a start date", () => {
    state().setStartDate("2026-10-12");
    state().addStay();
    render(<StaysEditor />);
    expect(screen.getAllByRole("option", { name: "Day 2 · 13 Oct" }).length).toBeGreaterThan(0);
  });

  it("warns when hotels share a night, and says when the trip has no nights", () => {
    state().addStay();
    state().addStay({ checkIn: 2, nights: 1 });
    const { unmount } = render(<StaysEditor />);
    expect(screen.getAllByText(/Shares nights with/)).toHaveLength(2); // shown on both hotels
    unmount();
    state().loadTrip(createTrip({ days: 1, nights: 0 }));
    render(<StaysEditor />);
    expect(screen.getByText(/day trip with no nights/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add hotel" })).toBeDisabled();
  });

  it("removes a hotel", () => {
    state().addStay();
    render(<StaysEditor />);
    fireEvent.click(screen.getByLabelText("Remove Hotel 1"));
    expect(state().trip.stays).toHaveLength(0);
  });
});

describe("Hotels and the Costs tab", () => {
  it("lists each hotel under Daily charges, locked, and prices flow both ways", () => {
    const a = state().addStay({ checkIn: 1, nights: 2 });
    state().updateStay(a, { name: "Sea View", roomPrice: 3000, extraBeds: 1, extraBedPrice: 800 });
    state().addStay({ checkIn: 3, nights: 1 });
    render(<CostTable />);
    const rows = within(daily()).getAllByTestId("row-stay");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Sea View: rooms");
    expect(rows[0]).toHaveTextContent("Day 1 to 3 · 2 rooms × 2 nights"); // 4 people, 2 per room
    expect(rows[0]).toHaveTextContent("$12,000.00");
    expect(within(daily()).getByTestId("row-extraBed")).toHaveTextContent("1 bed × 2 nights");
    expect(within(rows[0]).queryByLabelText(/^Remove/)).toBeNull();
    expect(within(rows[0]).getByLabelText(/managed in the itinerary/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Sea View: rooms price"), { target: { value: "3500" } });
    expect(state().trip.stays[0].roomPrice).toBe(3500);
    fireEvent.change(screen.getByLabelText("Sea View: extra bed price"), { target: { value: "900" } });
    expect(state().trip.stays[0].extraBedPrice).toBe(900);
  });

  it("removing a hotel in the itinerary removes its rows", () => {
    const id = state().addStay();
    state().updateStay(id, { roomPrice: 1000 });
    render(<><StaysEditor /><CostTable /></>);
    expect(within(daily()).getByTestId("row-stay")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Remove Hotel 1"));
    expect(within(daily()).queryByTestId("row-stay")).toBeNull();
  });

  it("changes cost when people change (automatic rooms)", () => {
    const id = state().addStay();
    state().updateStay(id, { roomPrice: 1000 }); // 4 people = 2 rooms x 3 nights
    render(<CostTable />);
    expect(screen.getByTestId("row-stay")).toHaveTextContent("$6,000.00");
  });
});

describe("Hotels in the itinerary days and timeline", () => {
  it("shows check-in, staying-on, check-out and missing-hotel notes on each day", () => {
    state().addStay({ checkIn: 1, nights: 2 });
    state().addStay({ checkIn: 3, nights: 1 });
    render(<Itinerary />);
    expect(within(screen.getByLabelText("Hotel on day 1")).getByText(/Check in: Hotel 1/)).toBeInTheDocument();
    expect(within(screen.getByLabelText("Hotel on day 2")).getByText(/Staying at Hotel 1/)).toBeInTheDocument();
    const d3 = within(screen.getByLabelText("Hotel on day 3"));
    expect(d3.getByText(/Check out: Hotel 1/)).toBeInTheDocument();
    expect(d3.getByText(/Check in: Hotel 2/)).toBeInTheDocument();
    const d4 = within(screen.getByLabelText("Hotel on day 4"));
    expect(d4.getByText(/Check out: Hotel 2/)).toBeInTheDocument();
  });

  it("flags a night with no hotel on the day", () => {
    state().addStay({ checkIn: 1, nights: 1 });
    render(<Itinerary />);
    expect(within(screen.getByLabelText("Hotel on day 2")).getByText("No hotel for tonight")).toBeInTheDocument();
  });

  it("shows hotels on the timeline", () => {
    state().addStay({ checkIn: 1, nights: 2 });
    state().addStay({ checkIn: 3, nights: 1 });
    render(<Itinerary />);
    fireEvent.click(screen.getByRole("button", { name: "timeline" }));
    expect(screen.getByTestId("lodging-1")).toHaveTextContent("Check in to Hotel 1 for the night");
    expect(screen.getByTestId("lodging-2")).toHaveTextContent("Staying at Hotel 1 tonight");
    expect(screen.getByTestId("lodging-out-3")).toHaveTextContent("Check out of Hotel 1");
    expect(screen.getByTestId("lodging-3")).toHaveTextContent("Check in to Hotel 2");
  });
});

describe("Hotels in the PDF report", () => {
  it("lists each hotel with dates, rooms and totals", () => {
    state().setStartDate("2026-10-12");
    const id = state().addStay({ checkIn: 1, nights: 2 });
    state().updateStay(id, { name: "Sea View", roomPrice: 3000, extraBeds: 1, extraBedPrice: 800 });
    const r = buildReport(state().trip, 3);
    expect(r.subtitle).toContain("1 hotel");
    expect(r.stays).toHaveLength(1);
    expect(r.stays[0]).toMatchObject({ name: "Sea View" });
    expect(r.stays[0].range).toContain("12 Oct");
    expect(r.stays[0].detail).toContain("2 rooms x 2 nights");
    expect(r.stays[0].detail).toContain("1 extra bed");
    expect(r.stays[0].total).toContain("13,600"); // 2x2x3000 + 1x2x800
  });
});

describe("Choosing a hotel as a stop or a transfer start", () => {
  const setup = () => {
    const a = state().addStay({ checkIn: 1, nights: 2 });
    state().updateStay(a, { name: "Sea View" });
    const b = state().addStay({ checkIn: 3, nights: 1 });
    state().updateStay(b, { name: "City Inn" });
    state().updateDay(1, { places: [
      { name: "Fort Aguada", time: "", transferIn: null, people: null, fee: 0, activities: [] },
      { name: "", time: "", transferIn: { mode: "cab", from: "", cost: 0, billing: "group", people: null, time: "" }, people: null, fee: 0, activities: [] },
    ] });
  };

  it("suggests your hotels when naming a stop, and picking one fills the name", () => {
    setup();
    render(<Itinerary />);
    const input = screen.getByLabelText("Day 1 place 2");
    fireEvent.focus(input);
    const list = screen.getByRole("listbox", { name: "Day 1 place 2 suggestions" });
    expect(within(list).getByText("Sea View")).toBeInTheDocument();
    expect(within(list).getByText("City Inn")).toBeInTheDocument();
    fireEvent.mouseDown(within(list).getByText("Sea View"));
    expect(state().trip.itinerary[0].places[1].name).toBe("Sea View");
    expect(screen.queryByRole("listbox", { name: "Day 1 place 2 suggestions" })).not.toBeInTheDocument();
  });

  it("filters suggestions as you type and still accepts free text", () => {
    setup();
    render(<Itinerary />);
    const input = screen.getByLabelText("Day 1 place 2");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "city" } });
    const opts = within(screen.getByRole("listbox", { name: "Day 1 place 2 suggestions" })).getAllByRole("option").map((o) => o.textContent);
    expect(opts).toEqual(["City Inn"]);
    fireEvent.change(input, { target: { value: "Hotel California" } });
    expect(screen.queryByRole("listbox", { name: "Day 1 place 2 suggestions" })).not.toBeInTheDocument();
    expect(state().trip.itinerary[0].places[1].name).toBe("Hotel California");
  });

  it("suggests hotels and the day's other places as where a transfer starts", () => {
    setup();
    render(<Itinerary />);
    const from = screen.getByLabelText("Day 1 place 2 transfer from");
    fireEvent.focus(from);
    const list = screen.getByRole("listbox", { name: "Day 1 place 2 transfer from suggestions" });
    expect(within(list).getByText("Your hotels")).toBeInTheDocument();
    expect(within(list).getByText("Sea View")).toBeInTheDocument();
    expect(within(list).getByText("Other places today")).toBeInTheDocument();
    expect(within(list).getByText("Fort Aguada")).toBeInTheDocument();
    fireEvent.mouseDown(within(list).getByText("City Inn"));
    expect(state().trip.itinerary[0].places[1].transferIn?.from).toBe("City Inn");
    expect(within(screen.getByLabelText("Day 1 place 2 transfer from").parentElement as HTMLElement).queryByRole("listbox")).toBeNull();
  });

  it("selects with the keyboard, but Enter without a highlighted option still adds a row", () => {
    setup();
    render(<Itinerary />);
    const input = screen.getByLabelText("Day 1 place 2");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(state().trip.itinerary[0].places[1].name).toBe("Sea View");
    const before = state().trip.itinerary[0].places.length;
    fireEvent.blur(input);
    fireEvent.keyDown(screen.getByLabelText("Day 1 place 1"), { key: "Enter" });
    expect(state().trip.itinerary[0].places.length).toBe(before + 1);
  });

  it("uses the hotel icon for a stop that is one of your hotels, in the list and on the timeline", () => {
    setup();
    state().updateDay(1, { places: [
      { name: "sea view", time: "", transferIn: null, people: null, fee: 0, activities: [] },
      { name: "Fort Aguada", time: "", transferIn: { mode: "cab", from: "Sea View", cost: 500, billing: "group", people: null, time: "" }, people: null, fee: 0, activities: [] },
    ] });
    render(<Itinerary />);
    const row = screen.getByTestId("Day 1-row-0");
    expect(row.querySelector('[data-icon="hotel"]')).not.toBeNull();
    expect(screen.getByTestId("Day 1-row-1").querySelector('[data-icon="landmark"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "timeline" }));
    expect(screen.getByTestId("stop-1-0").querySelector('[data-icon="hotel"]')).not.toBeNull();
    expect(screen.getByTestId("transfer-1-1")).toHaveTextContent("Cab · Sea View to Fort Aguada");
  });

  it("shows no dropdown when there are no hotels or other places to suggest", () => {
    state().updateDay(1, { places: [{ name: "", time: "", transferIn: null, people: null, fee: 0, activities: [] }] });
    render(<Itinerary />);
    fireEvent.focus(screen.getByLabelText("Day 1 place 1"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
