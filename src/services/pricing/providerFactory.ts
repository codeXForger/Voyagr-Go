import { AmadeusProvider } from "./AmadeusProvider";
import { CompositeProvider } from "./CompositeProvider";
import { EstimatorProvider } from "./EstimatorProvider";
import type { PriceProvider } from "./PriceProvider";

type Env = Record<string, string | undefined>;

/** Factory: live providers when credentials exist, always backed by the estimator. */
export function createPriceProvider(env: Env = process.env): PriceProvider {
  const providers: PriceProvider[] = [];
  if (env.AMADEUS_CLIENT_ID && env.AMADEUS_CLIENT_SECRET) {
    providers.push(new AmadeusProvider(env.AMADEUS_CLIENT_ID, env.AMADEUS_CLIENT_SECRET));
  }
  providers.push(new EstimatorProvider());
  return new CompositeProvider(providers);
}
