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

// ─── Get email from Stripe customer ───
async function getEmailFromCustomer(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted && customer.email) {
      return customer.email;
    }
    return null;
  } catch {
    return null;
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

      // Deep link for APK: pilotofinanceiro://checkout-success
      const successUrl = `pilotofinanceiro://checkout-success`;
      const cancelUrl = `pilotofinanceiro://checkout-canceled`;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 7,
          metadata: { email },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { email },
      });

      res.json({ url: session.url });
    } catch (err: unknown) {
      console.error("[Stripe] Checkout error:", err);
      const message = err instanceof Error ? err.message : "Erro ao criar sessão de pagamento";
      res.status(500).json({ error: message });
    }
  });

  // ── POST /api/stripe/activate ──
  // Consulta o Stripe diretamente pelo email e ativa a assinatura no Supabase.
  // Usado pela rota /checkout-success para liberar acesso sem depender do webhook.
  app.post("/api/stripe/activate", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email é obrigatório" });
        return;
      }

      const stripe = getStripe();

      // Buscar o customer pelo email
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length === 0) {
        res.json({ ativo: false, message: "Nenhum customer encontrado no Stripe" });
        return;
      }

      const customerId = customers.data[0].id;

      // Buscar assinaturas ativas ou em trial para esse customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 5,
      });

      const activeOrTrialing = subscriptions.data.find(
        (s) => s.status === "active" || s.status === "trialing"
      );

      if (!activeOrTrialing) {
        res.json({ ativo: false, message: "Nenhuma assinatura ativa ou em trial encontrada" });
        return;
      }

      // Ativar no Supabase
      await upsertSubscription(email, {
        ativo: true,
        plano: "mensal",
        stripe_customer_id: customerId,
        stripe_subscription_id: activeOrTrialing.id,
      });

      console.log(`[Stripe] Activated subscription for ${email} via /activate endpoint (sub: ${activeOrTrialing.id}, status: ${activeOrTrialing.status})`);
      res.json({ ativo: true, plano: "mensal", subscription_status: activeOrTrialing.status });
    } catch (err: unknown) {
      console.error("[Stripe] Activate error:", err);
      const message = err instanceof Error ? err.message : "Erro ao ativar assinatura";
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

  // ── POST /api/stripe/billing-portal-session ──
  app.post("/api/stripe/billing-portal-session", async (req: Request, res: Response) => {
    try {
      // Extract authorization token from headers
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }

      const token = authHeader.substring(7);

      // Verify token with Supabase
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userRes.ok) {
        res.status(401).json({ error: "Token inválido ou expirado" });
        return;
      }

      const user = (await userRes.json()) as { email?: string };
      const authenticatedEmail = user.email;

      if (!authenticatedEmail) {
        res.status(401).json({ error: "Email não encontrado no token" });
        return;
      }

      // Use authenticated email from token
      const email = authenticatedEmail;

      const stripe = getStripe();

      // Get subscription from Supabase to find customer ID
      const result = await supabaseAdmin("subscriptions", "GET", undefined, {
        email: `eq.${email}`,
        select: "stripe_customer_id",
      });

      if (!result || !Array.isArray(result) || result.length === 0) {
        res.status(404).json({ error: "Nenhuma assinatura encontrada para este email" });
        return;
      }

      const customerId = result[0].stripe_customer_id;
      if (!customerId) {
        res.status(400).json({ error: "Customer ID não encontrado" });
        return;
      }

      // Create billing portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: "pilotofinanceiro://settings",
      });

      console.log(`[Stripe] Billing portal session created for ${email} (customer: ${customerId})`);
      res.json({ url: portalSession.url });
    } catch (err: unknown) {
      console.error("[Stripe] Billing portal session error:", err);
      const message = err instanceof Error ? err.message : "Erro ao criar sessão do portal";
      res.status(500).json({ error: message });
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
          // ── Checkout completed (trial or paid) ──
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const email = session.metadata?.email || session.customer_email;
            if (email) {
              // Mark as active immediately — trial starts now
              await upsertSubscription(email, {
                ativo: true,
                plano: "mensal",
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
              });
              console.log(`[Stripe Webhook] checkout.session.completed → ativo=true for ${email}`);
            } else {
              console.warn("[Stripe Webhook] checkout.session.completed: no email found in metadata or customer_email");
            }
            break;
          }

          // ── Subscription created (handles trial start) ──
          case "customer.subscription.created": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            // Email from subscription metadata (set at checkout) or customer lookup
            const metaEmailCreated = subscription.metadata?.email;
            const emailCreated = metaEmailCreated || await getEmailFromCustomer(stripe, customerId);
            if (emailCreated) {
              // trialing, active → mark as active
              const isActive = ["trialing", "active"].includes(subscription.status);
              await upsertSubscription(emailCreated, {
                ativo: isActive,
                plano: "mensal",
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
              });
              console.log(`[Stripe Webhook] customer.subscription.created (${subscription.status}) → ativo=${isActive} for ${emailCreated}`);
            } else {
              console.warn("[Stripe Webhook] customer.subscription.created: could not resolve email");
            }
            break;
          }

          // ── Subscription updated (e.g., trial ended, plan changed) ──
          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            const metaEmailUpdated = subscription.metadata?.email;
            const emailUpdated = metaEmailUpdated || await getEmailFromCustomer(stripe, customerId);
            if (emailUpdated) {
              const isActive = ["trialing", "active"].includes(subscription.status);
              await upsertSubscription(emailUpdated, {
                ativo: isActive,
                plano: "mensal",
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
              });
              console.log(`[Stripe Webhook] customer.subscription.updated (${subscription.status}) → ativo=${isActive} for ${emailUpdated}`);
            }
            break;
          }

          // ── Invoice paid (renewal) ──
          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            const email = invoice.customer_email;
            if (email) {
              await upsertSubscription(email, { ativo: true, plano: "mensal" });
              console.log(`[Stripe Webhook] invoice.paid → ativo=true for ${email}`);
            }
            break;
          }

          // ── Invoice payment failed ──
          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const email = invoice.customer_email;
            if (email) {
              await upsertSubscription(email, { ativo: false, plano: "mensal" });
              console.log(`[Stripe Webhook] invoice.payment_failed → ativo=false for ${email}`);
            }
            break;
          }

          // ── Subscription deleted/cancelled ──
          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            const metaEmailDeleted = subscription.metadata?.email;
            const emailDeleted = metaEmailDeleted || await getEmailFromCustomer(stripe, customerId);
            if (emailDeleted) {
              await upsertSubscription(emailDeleted, { ativo: false, plano: "mensal" });
              console.log(`[Stripe Webhook] customer.subscription.deleted → ativo=false for ${emailDeleted}`);
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
