import { describe, expect, it } from "vitest";
import { findLocation, getAllLocations, searchLocations, toIata } from "./locations";

const locationsCount = () => getAllLocations().length;

describe("locations", () => {
  it("finds by name or code, case-insensitively", () => {
    expect(findLocation("delhi")?.iata).toBe("DEL");
    expect(findLocation("BLR")?.name).toBe("Bengaluru");
    expect(findLocation("nowhere")).toBeUndefined();
    expect(toIata(" Goa ")).toBe("GOI");
    expect(toIata("Atlantis")).toBe("");
  });

  it("returns popular places for an empty query and respects the limit", () => {
    expect(searchLocations("", 5)).toHaveLength(5);
    expect(searchLocations("", 5)[0].name).toBe("Delhi");
  });

  it("ranks an exact code first, then name prefixes, then other matches", () => {
    expect(searchLocations("goa")[0].name).toBe("Goa");
    expect(searchLocations("del")[0].name).toBe("Delhi");
    expect(searchLocations("bom")[0].name).toBe("Mumbai");
    const names = searchLocations("new").map((l) => l.name);
    expect(names[0]).toBe("New York");
  });

  it("matches on country, notes and word starts", () => {
    expect(searchLocations("thailand").map((l) => l.name)).toEqual(expect.arrayContaining(["Bangkok", "Phuket"]));
    expect(searchLocations("darjeeling")[0].name).toBe("Bagdogra");
    expect(searchLocations("york")[0].name).toBe("New York");
    expect(searchLocations("zzzz")).toEqual([]);
  });
});

describe("full airport list", () => {
  it("finds US states and cities such as California and Chicago", () => {
    const cali = searchLocations("california", 20).map((l) => l.iata);
    expect(cali).toEqual(expect.arrayContaining(["LAX", "SFO", "SAN"]));
    expect(searchLocations("chicago").map((l) => l.iata)).toEqual(expect.arrayContaining(["ORD", "MDW"]));
    expect(searchLocations("chicago")[0].iata).toBe("ORD"); // the popular airport gets the plain name
  });

  it("covers airports worldwide, not only popular ones", () => {
    expect(searchLocations("reykjavik")[0]?.country).toBe("Iceland");
    expect(searchLocations("tromso")[0]?.iata).toBe("TOS");
    expect(searchLocations("hubballi")[0]?.country).toBe("India");
    expect(locationsCount()).toBeGreaterThan(3500);
  });

  it("lets a place name beat an airport code that happens to spell the same (Goa vs GOA, Genoa)", () => {
    expect(searchLocations("goa")[0].name).toBe("Goa");
    expect(searchLocations("goa").map((l) => l.iata)).toContain("GOA");
  });

  it("ignores accents", () => {
    expect(findLocation("Reykjavik")?.iata).toBe("KEF");
    expect(findLocation("REYKJAVÍK")?.iata).toBe("KEF");
    expect(searchLocations("tromso")[0].iata).toBe("TOS");
  });

  it("gives every place a unique name that maps back to one airport", () => {
    const paris = searchLocations("paris", 10);
    const names = paris.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
    for (const l of paris) expect(findLocation(l.name)?.iata).toBe(l.iata);
    expect(findLocation("Chicago · MDW")?.iata).toBe("MDW");
    expect(toIata("Chicago")).toBe("ORD");
  });

  it("understands country nicknames, regions and airport names", () => {
    expect(searchLocations("usa", 5).every((l) => l.country === "United States")).toBe(true);
    expect(searchLocations("uk", 5).every((l) => l.country === "United Kingdom")).toBe(true);
    expect(searchLocations("o'hare")[0].iata).toBe("ORD");
    expect(searchLocations("kerala")[0].name).toBe("Kerala");
    expect(searchLocations("bangalore")[0].name).toBe("Bengaluru");
  });
});
