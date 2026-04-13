/**
 * Trial management for 7-day free access.
 * 
 * Endpoints:
 * - POST /api/trial/create          → Create trial for new user
 * - GET  /api/trial/check?email=... → Check trial status
 * - POST /api/trial/extend          → Extend trial if needed (admin only)
 */
import type { Express, Request, Response } from "express";

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

// ─── Helper: Calculate trial dates ───
function getTrialDates() {
  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  return {
    trial_start: trialStart.toISOString(),
    trial_end: trialEnd.toISOString(),
  };
}

// ─── Register Trial routes ───
export function registerTrialRoutes(app: Express) {
  // ── POST /api/trial/create ──
  // Create trial for new user after signup
  app.post("/api/trial/create", async (req: Request, res: Response) => {
    try {
      const { email, user_id } = req.body;
      if (!email || !user_id) {
        res.status(400).json({ error: "Email e user_id são obrigatórios" });
        return;
      }

      const { trial_start, trial_end } = getTrialDates();

      // Create trial record in Supabase
      const result = await supabaseAdmin("user_trials", "POST", {
        user_id,
        email,
        trial_start,
        trial_end,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (!result) {
        res.status(500).json({ error: "Erro ao criar trial" });
        return;
      }

      console.log(`[Trial] Created 7-day trial for ${email} (user_id: ${user_id})`);
      res.json({
        success: true,
        trial_start,
        trial_end,
        days_remaining: 7,
      });
    } catch (err: unknown) {
      console.error("[Trial] Create error:", err);
      const message = err instanceof Error ? err.message : "Erro ao criar trial";
      res.status(500).json({ error: message });
    }
  });

  // ── GET /api/trial/check ──
  // Check if user has active trial
  app.get("/api/trial/check", async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        res.status(400).json({ error: "Email é obrigatório" });
        return;
      }

      const result = await supabaseAdmin("user_trials", "GET", undefined, {
        email: `eq.${email}`,
        select: "trial_start,trial_end,is_active",
        order: "created_at.desc",
        limit: "1",
      });

      if (!result || !Array.isArray(result) || result.length === 0) {
        res.json({
          has_trial: false,
          is_active: false,
          days_remaining: 0,
          trial_end: null,
        });
        return;
      }

      const trial = result[0];
      const now = new Date();
      const trialEnd = new Date(trial.trial_end);
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const isActive = trial.is_active && daysRemaining > 0;

      console.log(`[Trial] Check for ${email}: active=${isActive}, days_remaining=${Math.max(0, daysRemaining)}`);

      res.json({
        has_trial: true,
        is_active: isActive,
        days_remaining: Math.max(0, daysRemaining),
        trial_end: trial.trial_end,
      });
    } catch (err: unknown) {
      console.error("[Trial] Check error:", err);
      res.status(500).json({ error: "Erro ao verificar trial" });
    }
  });

  // ── POST /api/trial/extend ──
  // Extend trial for a user (admin only, for testing)
  app.post("/api/trial/extend", async (req: Request, res: Response) => {
    try {
      const { email, days = 7 } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email é obrigatório" });
        return;
      }

      // Get current trial
      const current = await supabaseAdmin("user_trials", "GET", undefined, {
        email: `eq.${email}`,
        select: "trial_end",
        order: "created_at.desc",
        limit: "1",
      });

      if (!current || !Array.isArray(current) || current.length === 0) {
        res.status(404).json({ error: "Trial não encontrado" });
        return;
      }

      const currentEnd = new Date(current[0].trial_end);
      const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

      // Update trial
      await supabaseAdmin(
        "user_trials",
        "PATCH",
        { trial_end: newEnd.toISOString(), updated_at: new Date().toISOString() },
        { email: `eq.${email}` }
      );

      console.log(`[Trial] Extended trial for ${email} by ${days} days`);
      res.json({
        success: true,
        new_trial_end: newEnd.toISOString(),
      });
    } catch (err: unknown) {
      console.error("[Trial] Extend error:", err);
      const message = err instanceof Error ? err.message : "Erro ao estender trial";
      res.status(500).json({ error: message });
    }
  });
}
