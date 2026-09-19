import { NextResponse } from "next/server";
import { z } from "zod";
import { createPriceProvider } from "@/services/pricing/providerFactory";

const bodySchema = z.object({
  origin: z.string().default(""),
  destination: z.string().min(1),
  currency: z.string().default("INR"),
  startDate: z.string().optional(),
  days: z.number().int().min(1),
  nights: z.number().int().min(0),
  people: z.number().int().min(1),
});

/** Facade: one endpoint hiding provider selection and keeping API keys server-side. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const quotes = await createPriceProvider().getPrices(parsed.data);
  return NextResponse.json({ quotes });
}
