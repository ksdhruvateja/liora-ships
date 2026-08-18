import Stripe from "stripe";
import { getConfig } from "./config";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;
  const config = getConfig();
  client = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
    typescript: true,
  });
  return client;
}

export function resetStripeClient() {
  client = null;
}
