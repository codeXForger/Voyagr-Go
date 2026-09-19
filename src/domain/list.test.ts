import { describe, expect, it } from "vitest";
import { moveItem } from "./list";

describe("moveItem", () => {
  it("moves forward and backward without mutating", () => {
    const l = ["a", "b", "c", "d"];
    expect(moveItem(l, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(l, 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(l).toEqual(["a", "b", "c", "d"]);
  });
  it("clamps out-of-range targets and ignores bad sources", () => {
    expect(moveItem(["a", "b"], 0, 9)).toEqual(["b", "a"]);
    expect(moveItem(["a", "b"], 1, -3)).toEqual(["b", "a"]);
    expect(moveItem(["a", "b"], 5, 0)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});
