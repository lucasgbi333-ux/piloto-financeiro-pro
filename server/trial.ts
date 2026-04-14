import type { Express, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

console.log("[Trial INIT] SUPABASE_URL:", SUPABASE_URL);
console.log("[Trial INIT] SUPABASE_SERVICE_KEY:", SUPABASE_SERVICE_KEY ? "SET" : "NOT SET");

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Missing Supabase credentials");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function getTrialDates() {
  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { trial_start: trialStart.toISOString(), trial_end: trialEnd.toISOString() };
}

export function registerTrialRoutes(app: Express) {
  app.post("/api/trial/create", async (req: Request, res: Response) => {
    try {
      const { email, user_id } = req.body;

      if (!email || !user_id) {
        res.status(400).json({ error: "Email e user_id sao obrigatorios" });
        return;
      }

      const { trial_start, trial_end } = getTrialDates();

      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.auth.admin.updateUserById(user_id, {
          user_metadata: {
            trial_start,
            trial_end,
            is_trial_active: true,
          },
        });

        if (error) {
          console.error("[Trial] Supabase error:", error);
          // RETORNA O ERRO REAL DO SUPABASE PARA O APP
          res.status(500).json({ 
            error: error.message || "Erro desconhecido do Supabase",
            details: error
          });
          return;
        }

        res.json({ success: true, trial_start, trial_end, days_remaining: 7 });
      } catch (err: unknown) {
        console.error("[Trial] Exception:", err);
        const msg = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: msg, details: err });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: msg });
    }
  });

  app.get("/api/trial/check", async (req: Request, res: Response) => {
    try {
      const user_id = req.query.user_id as string;
      if (!user_id) {
        res.status(400).json({ error: "user_id obrigatorio" });
        return;
      }

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.auth.admin.getUserById(user_id);

      if (error || !data.user) {
        res.json({ has_trial: false, is_active: false, days_remaining: 0, trial_end: null });
        return;
      }

      const metadata = data.user.user_metadata || {};
      const trial_end = metadata.trial_end;
      const is_trial_active = metadata.is_trial_active;

      if (!trial_end || !is_trial_active) {
        res.json({ has_trial: false, is_active: false, days_remaining: 0, trial_end: null });
        return;
      }

      const now = new Date();
      const trialEndDate = new Date(trial_end);
      const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const isActive = daysRemaining > 0;

      res.json({ has_trial: true, is_active: isActive, days_remaining: Math.max(0, daysRemaining), trial_end });
    } catch (err: unknown) {
      res.status(500).json({ error: "Erro ao verificar trial" });
    }
  });
}
