import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

interface SupabaseAuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signUp,
        resetPassword,
        signOut,
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
