import { describe, expect, it } from "vitest";
import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://x/api/prices", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/prices", () => {
  it("returns quotes for a valid request", async () => {
    const res = await POST(req({ destination: "Goa", days: 3, nights: 2, people: 2 }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.quotes.length).toBe(9);
  });
  it("rejects invalid input with 400", async () => {
    expect((await POST(req({ destination: "", days: 0 }))).status).toBe(400);
  });
});
