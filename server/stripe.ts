/**
 * Stripe integration for subscription management.
 * 
 * Endpoints:
 * - POST /api/stripe/create-checkout  → Creates a Stripe Checkout session
 * - POST /api/stripe/webhook          → Handles Stripe webhook events
 * - GET  /api/stripe/subscription-status?email=...  → Checks subscription status
 */
import type { Express, Request, Response } from "express";
import Stripe from "stripe";

// ─── Supabase Admin Client (server-side, uses service_role key) ───
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function supabaseAdmin(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>,
) {
  const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: method === "POST" ? "return=representation" : "return=minimal",
  };

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Supabase] ${method} ${path} failed: ${res.status} ${text}`);
    return null;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return null;
}

// ─── Stripe Client ───
function getStripe(): Stripe {
  const key = process.env.STRIPE_KEY;
  if (!key) throw new Error("STRIPE_KEY not set");
  return new Stripe(key);
}

// ─── Upsert subscription in Supabase ───
async function upsertSubscription(
  email: string,
  data: {
    ativo: boolean;
    plano: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
  },
) {
  // Check if subscription exists
  const existing = await supabaseAdmin("subscriptions", "GET", undefined, {
    email: `eq.${email}`,
    select: "id",
  });

  if (existing && Array.isArray(existing) && existing.length > 0) {
    // Update existing
    await supabaseAdmin(
      "subscriptions",
      "PATCH",
      { ...data, updated_at: new Date().toISOString() },
      { email: `eq.${email}` },
    );
    console.log(`[Stripe] Updated subscription for ${email}: ativo=${data.ativo}`);
  } else {
    // Insert new
    await supabaseAdmin("subscriptions", "POST", {
      email,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    console.log(`[Stripe] Created subscription for ${email}: ativo=${data.ativo}`);
  }
}

// ─── Register Stripe routes ───
export function registerStripeRoutes(app: Express) {
  const priceId = process.env.STRIPE_PRICE;

  // ── POST /api/stripe/create-checkout ──
  app.post("/api/stripe/create-checkout", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email é obrigatório" });
        return;
      }
      if (!priceId) {
        res.status(500).json({ error: "STRIPE_PRICE não configurado" });
        return;
      }

      const stripe = getStripe();

      // Get or create customer by email
      const customers = await stripe.customers.list({ email, limit: 1 });
      let customerId: string;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email });
        customerId = customer.id;
      }

      // Determine success/cancel URLs
      // Use the app's published domain if available, otherwise use the request origin
      const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "https://pilotofin-jwjxudxa.manus.space";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/login?success=true`,
        cancel_url: `${origin}/login?canceled=true`,
        metadata: { email },
      });

      res.json({ url: session.url });
    } catch (err: unknown) {
      console.error("[Stripe] Checkout error:", err);
      const message = err instanceof Error ? err.message : "Erro ao criar sessão de pagamento";
      res.status(500).json({ error: message });
    }
  });

  // ── GET /api/stripe/subscription-status ──
  app.get("/api/stripe/subscription-status", async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        res.status(400).json({ error: "Email é obrigatório" });
        return;
      }

      const result = await supabaseAdmin("subscriptions", "GET", undefined, {
        email: `eq.${email}`,
        select: "ativo,plano,updated_at",
      });

      if (result && Array.isArray(result) && result.length > 0) {
        res.json({ ativo: result[0].ativo, plano: result[0].plano });
      } else {
        res.json({ ativo: false, plano: null });
      }
    } catch (err: unknown) {
      console.error("[Stripe] Status check error:", err);
      res.status(500).json({ error: "Erro ao verificar assinatura" });
    }
  });
}

// ─── Webhook handler (needs raw body, registered separately) ───
export function registerStripeWebhook(app: Express) {
  const webhookSecret = process.env.STRIPE_WEBHOOK;

  app.post(
    "/api/stripe/webhook",
    // Raw body middleware for signature verification
    (req: Request, _res: Response, next) => {
      let data = Buffer.alloc(0);
      req.on("data", (chunk: Buffer) => {
        data = Buffer.concat([data, chunk]);
      });
      req.on("end", () => {
        (req as any).rawBody = data;
        next();
      });
    },
    async (req: Request, res: Response) => {
      try {
        const stripe = getStripe();
        const sig = req.headers["stripe-signature"] as string;
        const rawBody = (req as any).rawBody as Buffer;

        let event: Stripe.Event;

        if (webhookSecret) {
          try {
            event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Assinatura inválida";
            console.error("[Stripe Webhook] Signature verification failed:", message);
            res.status(400).json({ error: `Webhook signature failed: ${message}` });
            return;
          }
        } else {
          // No webhook secret configured, parse raw body
          event = JSON.parse(rawBody.toString()) as Stripe.Event;
          console.warn("[Stripe Webhook] No STRIPE_WEBHOOK secret configured, skipping signature verification");
        }

        console.log(`[Stripe Webhook] Received event: ${event.type}`);

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const email = session.metadata?.email || session.customer_email;
            if (email) {
              await upsertSubscription(email, {
                ativo: true,
                plano: "mensal",
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
              });
            }
            break;
          }

          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            const email = invoice.customer_email;
            if (email) {
              await upsertSubscription(email, { ativo: true, plano: "mensal" });
            }
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const email = invoice.customer_email;
            if (email) {
              await upsertSubscription(email, { ativo: false, plano: "mensal" });
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            // Get customer email
            const customer = await stripe.customers.retrieve(subscription.customer as string);
            if (customer && !customer.deleted && customer.email) {
              await upsertSubscription(customer.email, { ativo: false, plano: "mensal" });
            }
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (err: unknown) {
        console.error("[Stripe Webhook] Error:", err);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    },
  );
}
