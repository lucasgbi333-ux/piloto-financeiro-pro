import { describe, expect, it } from "vitest";
import Stripe from "stripe";

describe("Stripe credentials validation", () => {
  it("STRIPE_KEY is set and starts with sk_", () => {
    const key = process.env.STRIPE_KEY;
    expect(key).toBeDefined();
    expect(key!.startsWith("sk_")).toBe(true);
  });

  it("STRIPE_PRICE is set and starts with price_", () => {
    const priceId = process.env.STRIPE_PRICE;
    expect(priceId).toBeDefined();
    expect(priceId!.startsWith("price_")).toBe(true);
  });

  it("STRIPE_KEY can connect to Stripe API", async () => {
    const key = process.env.STRIPE_KEY;
    if (!key) throw new Error("STRIPE_KEY not set");

    const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
    // Simple API call to verify the key works
    const balance = await stripe.balance.retrieve();
    expect(balance).toBeDefined();
    expect(balance.object).toBe("balance");
  });

  it("STRIPE_PRICE refers to a valid price", async () => {
    const key = process.env.STRIPE_KEY;
    const priceId = process.env.STRIPE_PRICE;
    if (!key || !priceId) throw new Error("Missing STRIPE_KEY or STRIPE_PRICE");

    const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
    const price = await stripe.prices.retrieve(priceId);
    expect(price).toBeDefined();
    expect(price.id).toBe(priceId);
    expect(price.type).toBe("recurring");
  });
});
