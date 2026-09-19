import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTripStore } from "@/store/tripStore";
import { createTrip } from "@/domain/trip";
import { CostTable } from "./CostTable";
import { ScenarioTable } from "./ScenarioTable";
import { TripForm } from "./TripForm";

beforeEach(() => {
  useTripStore.getState().loadTrip(createTrip({ destination: "Goa", currency: "USD" }));
  vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ destinations: [{ name: "Goa", country: "India" }], currencies: ["USD", "INR"] }) })));
});

describe("CostTable", () => {
  it("shows an icon per category and updates totals when a price is edited", () => {
    const { container } = render(<CostTable />);
    expect(container.querySelector('[data-icon="plane"]')).toBeInTheDocument();
    expect(container.querySelector('[data-icon="car"]')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Flights unit price"), { target: { value: "500" } });
    expect(screen.getByTestId("grand-total")).toHaveTextContent("$1,000");
    expect(screen.getByTestId("per-person")).toHaveTextContent("$500");
    expect(screen.getByText("edited")).toBeInTheDocument();
  });

  it("removes an item", () => {
    render(<CostTable />);
    fireEvent.click(screen.getByLabelText("Remove Round-trip flight"));
    expect(screen.queryByTestId("row-flight")).not.toBeInTheDocument();
  });
});

describe("TripForm", () => {
  it("links days and nights and updates people", () => {
    render(<TripForm />);
    fireEvent.change(screen.getByLabelText("Days"), { target: { value: "7" } });
    expect(screen.getByLabelText("Nights")).toHaveValue(6);
    fireEvent.change(screen.getByLabelText("People"), { target: { value: "5" } });
    expect(useTripStore.getState().trip.config.people).toBe(5);
    fireEvent.change(screen.getByLabelText("Extra beds"), { target: { value: "2" } });
    expect(useTripStore.getState().trip.config.extraBeds).toBe(2);
  });
});

describe("ScenarioTable", () => {
  it("lists a row per group size", () => {
    render(<ScenarioTable />);
    expect(screen.getAllByRole("row")).toHaveLength(9); // header + 8
  });
});

describe("CostTable sections", () => {
  it("puts stay, extra bed, cab and meals under daily charges and flights under trip charges", () => {
    render(<CostTable />);
    const daily = screen.getByRole("group", { name: "Daily charges" });
    const once = screen.getByRole("group", { name: "Trip charges" });
    for (const c of ["stay", "extraBed", "cab", "breakfast", "lunch", "dinner"]) {
      expect(daily.querySelector(`[data-testid="row-${c}"]`)).not.toBeNull();
    }
    expect(once.querySelector('[data-testid="row-flight"]')).not.toBeNull();
    expect(once.querySelector('[data-testid="row-stay"]')).toBeNull();
  });
  it("shows per-day totals for daily charges", () => {
    render(<CostTable />);
    fireEvent.change(screen.getByLabelText("Stay unit price"), { target: { value: "1000" } });
    // 1 room x 3 nights x 1000 = 3000 over 4 days => 750 per day, 375 per person per day
    const daily = screen.getByRole("group", { name: "Daily charges" });
    expect(daily).toHaveTextContent("$750");
    expect(daily).toHaveTextContent("$375");
  });
});

describe("LocationCombobox and dates in TripForm", () => {
  it("searches places and picks one with the mouse", () => {
    render(<TripForm />);
    const from = screen.getByLabelText("Origin");
    fireEvent.focus(from);
    fireEvent.change(from, { target: { value: "del" } });
    const list = screen.getByRole("listbox", { name: "Origin suggestions" });
    expect(list).toHaveTextContent("Delhi");
    expect(list).toHaveTextContent("DEL");
    fireEvent.mouseDown(screen.getByRole("option", { name: /Delhi/ }));
    expect(useTripStore.getState().trip.config.origin).toBe("Delhi");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("picks with the keyboard and allows free text", () => {
    render(<TripForm />);
    const to = screen.getByLabelText("Destination");
    fireEvent.focus(to);
    fireEvent.change(to, { target: { value: "ma" } });
    fireEvent.keyDown(to, { key: "ArrowDown" });
    const second = screen.getAllByRole("option")[1].textContent;
    fireEvent.keyDown(to, { key: "Enter" });
    expect(second).toContain(useTripStore.getState().trip.config.destination);

    fireEvent.change(to, { target: { value: "Hampi" } });
    expect(screen.getByRole("option", { name: /Use “Hampi”/ })).toBeInTheDocument();
    fireEvent.keyDown(to, { key: "Enter" });
    expect(useTripStore.getState().trip.config.destination).toBe("Hampi");
    fireEvent.keyDown(to, { key: "Escape" });
  });

  it("swaps from and to", () => {
    useTripStore.getState().setConfig({ origin: "Delhi", destination: "Goa" });
    render(<TripForm />);
    fireEvent.click(screen.getByLabelText("Swap from and to"));
    expect(useTripStore.getState().trip.config).toMatchObject({ origin: "Goa", destination: "Delhi" });
  });

  it("links the dates to days and nights", () => {
    render(<TripForm />);
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-10-12" } });
    expect(screen.getByLabelText("To date")).toHaveValue("2026-10-15"); // 3 nights by default
    fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-10-19" } });
    expect(useTripStore.getState().trip.config).toMatchObject({ nights: 7, days: 8 });
    expect(useTripStore.getState().trip.itinerary).toHaveLength(8);
    fireEvent.change(screen.getByLabelText("Days"), { target: { value: "3" } });
    expect(screen.getByLabelText("To date")).toHaveValue("2026-10-14");
  });
});

describe("LocationCombobox search vs. chosen", () => {
  it("still searches when the text is only an airport code, and lists popular places once a name is chosen", () => {
    render(<TripForm />);
    const from = screen.getByLabelText("Origin");
    fireEvent.focus(from);
    fireEvent.change(from, { target: { value: "bom" } });
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("Mumbai");
    expect(screen.getAllByRole("option").some((o) => o.textContent?.includes("Delhi"))).toBe(false);
    fireEvent.change(from, { target: { value: "Mumbai" } });
    expect(screen.getAllByRole("option").length).toBeGreaterThan(3); // popular list to switch
    expect(screen.queryByRole("option", { name: /Use “Mumbai”/ })).not.toBeInTheDocument();
  });
});

describe("LocationCombobox large result sets", () => {
  it("lists every California airport (scrollable), not just the first few", () => {
    render(<TripForm />);
    const to = screen.getByLabelText("Destination");
    fireEvent.focus(to);
    fireEvent.change(to, { target: { value: "california" } });
    expect(screen.getAllByRole("option").length).toBeGreaterThan(20);
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("Los Angeles");
  });
});
