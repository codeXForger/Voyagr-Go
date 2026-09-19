import { describe, expect, it, vi } from "vitest";
import { createTrip } from "@/domain/trip";
import { GoogleDriveStorage } from "./GoogleDriveStorage";
import { deserializeTrip, fileNameFor, serializeTrip } from "./serialization";

const trip = createTrip({ destination: "Goa" });
const res = (body: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 500, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) }) as Response;

describe("serialization", () => {
  it("round-trips and builds a safe file name", () => {
    expect(deserializeTrip(serializeTrip(trip))).toEqual(trip);
    expect(fileNameFor({ ...trip, name: "Goa / 2026!" })).toBe("Goa_2026_.voyagr.json");
  });
  it("rejects corrupt files", () => {
    expect(() => deserializeTrip("{}")).toThrow();
  });
});

describe("GoogleDriveStorage", () => {
  const auth = { getAccessToken: async () => "tok", pickFile: vi.fn(async () => "file1" as string | null) };

  it("creates the folder once, uploads, then updates the same file", async () => {
    const calls: { url: string; method?: string }[] = [];
    const http = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method });
      if (url.includes("?q=")) return res({ files: [] });
      if (url.includes("uploadType=multipart")) return res({ id: "f1" });
      return res({ id: "folder1" });
    });
    const s = new GoogleDriveStorage(auth, http as unknown as typeof fetch);
    await s.save(trip);
    await s.save(trip);
    expect(calls.filter((c) => c.url.includes("uploadType=multipart"))).toHaveLength(1);
    expect(calls.at(-1)).toMatchObject({ method: "PATCH" });
    expect(calls.at(-1)!.url).toContain("/files/f1");
    expect(http.mock.calls[0][1]!.headers).toMatchObject({ Authorization: "Bearer tok" });
  });

  it("opens the picked file", async () => {
    const http = vi.fn(async () => res(serializeTrip(trip)));
    const s = new GoogleDriveStorage(auth, http as unknown as typeof fetch);
    expect(await s.open()).toEqual(trip);
  });

  it("returns null when the picker is cancelled and throws on API errors", async () => {
    const s = new GoogleDriveStorage({ ...auth, pickFile: async () => null }, vi.fn() as unknown as typeof fetch);
    expect(await s.open()).toBeNull();
    const failing = new GoogleDriveStorage(auth, (async () => res({}, false)) as unknown as typeof fetch);
    await expect(failing.save(trip)).rejects.toThrow(/failed/);
  });
});
