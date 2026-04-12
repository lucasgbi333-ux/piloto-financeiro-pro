import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { Platform } from "react-native";
import { supabase } from "./supabase";
import { getApiBaseUrl } from "@/constants/oauth";
import type { Session, User } from "@supabase/supabase-js";

interface SubscriptionStatus {
  ativo: boolean;
  plano: string | null;
}

interface SupabaseAuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  subscription: SubscriptionStatus;
  subscriptionLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  checkSubscription: () => Promise<void>;
  createCheckout: () => Promise<{ url: string | null; error: string | null }>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({ ativo: false, plano: null });
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => authSub.unsubscribe();
  }, []);

  // Check subscription status when session changes
  const checkSubscription = useCallback(async () => {
    const email = session?.user?.email;
    if (!email) {
      setSubscription({ ativo: false, plano: null });
      return;
    }

    setSubscriptionLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(
        `${apiBase}/api/stripe/subscription-status?email=${encodeURIComponent(email)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setSubscription({ ativo: data.ativo ?? false, plano: data.plano ?? null });
      } else {
        console.warn("[Auth] Failed to check subscription:", res.status);
        setSubscription({ ativo: false, plano: null });
      }
    } catch (err) {
      console.error("[Auth] Subscription check error:", err);
      setSubscription({ ativo: false, plano: null });
    } finally {
      setSubscriptionLoading(false);
    }
  }, [session?.user?.email]);

  // Auto-check subscription when session changes
  useEffect(() => {
    if (session?.user?.email) {
      checkSubscription();
    } else {
      setSubscription({ ativo: false, plano: null });
    }
  }, [session?.user?.email, checkSubscription]);

  // Create Stripe checkout session
  const createCheckout = useCallback(async (): Promise<{ url: string | null; error: string | null }> => {
    const email = session?.user?.email;
    if (!email) return { url: null, error: "Faça login primeiro" };

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { url: null, error: data.error || "Erro ao criar sessão de pagamento" };
      }

      const data = await res.json();
      return { url: data.url, error: null };
    } catch (err) {
      console.error("[Auth] Checkout error:", err);
      return { url: null, error: "Erro de conexão. Verifique sua internet." };
    }
  }, [session?.user?.email]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("invalid_credentials")
      ) {
        return { error: "Email ou senha inválidos. Verifique os dados e tente novamente." };
      }
      if (error.message.includes("Email not confirmed")) {
        return { error: "Confirme seu email antes de entrar. Verifique sua caixa de entrada." };
      }
      if (error.message.includes("rate limit") || error.message.includes("429")) {
        return { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error: string | null; needsConfirmation?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          display_name: fullName,
        },
      },
    });

    if (error) {
      if (
        error.message.includes("already registered") ||
        error.message.includes("User already registered")
      ) {
        return { error: "Este email já está cadastrado. Tente fazer login." };
      }
      if (error.message.includes("Password should be at least")) {
        return { error: "A senha deve ter pelo menos 6 caracteres." };
      }
      if (error.message.includes("email_address_invalid") || error.message.includes("invalid")) {
        return { error: "Email inválido. Use um email real (ex: nome@gmail.com)." };
      }
      if (error.message.includes("rate limit") || error.message.includes("429") || error.message.includes("over_email_send_rate_limit")) {
        return { error: "Limite de cadastros atingido. Aguarde alguns minutos e tente novamente." };
      }
      return { error: error.message };
    }

    // Se o usuário foi criado mas precisa confirmar email (identities vazio = email já existe sem confirmação)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { error: "Este email já está cadastrado. Tente fazer login." };
    }

    // Se a sessão foi criada automaticamente (email confirmation desabilitado no Supabase)
    if (data.session) {
      return { error: null, needsConfirmation: false };
    }

    // Precisa confirmar email
    return { error: null, needsConfirmation: true };
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      if (error.message.includes("rate limit") || error.message.includes("429")) {
        return { error: "Muitas solicitações. Aguarde alguns minutos e tente novamente." };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[Auth] signOut error:", err);
    }
    setSession(null);
    setSubscription({ ativo: false, plano: null });
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        subscription,
        subscriptionLoading,
        signIn,
        signUp,
        resetPassword,
        signOut,
        checkSubscription,
        createCheckout,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  return ctx;
}
