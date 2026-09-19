import { describe, expect, it } from "vitest";
import { addDays, dayDate, diffDays, endDateOf, formatRange, isIsoDate } from "./dates";

describe("dates", () => {
  it("validates ISO dates", () => {
    expect(isIsoDate("2026-10-12")).toBe(true);
    expect(isIsoDate("")).toBe(false);
    expect(isIsoDate("12/10/2026")).toBe(false);
    expect(isIsoDate("2026-13-40")).toBe(false);
  });
  it("adds and diffs days across month and year ends, and daylight-saving changes", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-10-12", "2026-10-15")).toBe(3);
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
    expect(diffDays("2026-10-15", "2026-10-12")).toBe(-3);
  });
  it("derives the end date and per-day dates from the start date and nights", () => {
    expect(endDateOf({ startDate: "2026-10-12", nights: 3 })).toBe("2026-10-15");
    expect(endDateOf({ startDate: "", nights: 3 })).toBe("");
    expect(dayDate({ startDate: "2026-10-12" }, 2)).toBe("2026-10-13");
    expect(dayDate({ startDate: "" }, 1)).toBe("");
  });
  it("formats a range, adding years only when they differ", () => {
    expect(formatRange({ startDate: "2026-10-12", nights: 3 })).toBe("12 Oct to 15 Oct 2026");
    expect(formatRange({ startDate: "2026-12-30", nights: 3 })).toBe("30 Dec 2026 to 2 Jan 2027");
    expect(formatRange({ startDate: "", nights: 3 })).toBe("");
  });
});
