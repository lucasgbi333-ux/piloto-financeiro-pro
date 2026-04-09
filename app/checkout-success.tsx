/**
 * Rota /checkout-success
 * 
 * Captura o deep link pilotofinanceiro://checkout-success após o pagamento/trial no Stripe.
 * Verifica o status da assinatura no Supabase com retry e redireciona para o Dashboard.
 */
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSupabaseAuth } from "@/lib/supabase-auth-provider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function CheckoutSuccessScreen() {
  const { checkSubscription, subscription, session } = useSupabaseAuth();
  const [status, setStatus] = useState<"checking" | "success" | "failed">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const verifyAndRedirect = async () => {
      // Se não tem sessão, redireciona para login
      if (!session) {
        router.replace("/login");
        return;
      }

      // Tenta verificar a assinatura com retry (até 6 tentativas, ~12s total)
      const maxAttempts = 6;
      const delayMs = 2000;

      for (let i = 0; i < maxAttempts; i++) {
        if (cancelled) return;

        setAttempt(i + 1);
        await checkSubscription();

        // Pequeno delay para o state atualizar
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Verifica se ficou ativo (lê direto do endpoint para não depender de re-render)
        try {
          const apiBase = getApiBaseUrl();
          const res = await fetch(
            `${apiBase}/api/stripe/subscription-status?email=${encodeURIComponent(session.user.email ?? "")}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.ativo === true) {
              if (cancelled) return;
              setStatus("success");
              // Aguarda um momento para mostrar o feedback visual
              await new Promise((resolve) => setTimeout(resolve, 1200));
              if (cancelled) return;
              // Atualiza o estado global uma última vez
              await checkSubscription();
              // Redireciona para o Dashboard
              router.replace("/(tabs)");
              return;
            }
          }
        } catch {
          // Ignora erros de rede, tenta novamente
        }

        // Aguarda antes da próxima tentativa
        if (i < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      // Se após todas as tentativas não encontrou assinatura ativa
      if (!cancelled) {
        setStatus("failed");
        // Redireciona para login/paywall após 3 segundos
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (!cancelled) {
          router.replace("/login");
        }
      }
    };

    verifyAndRedirect();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      {status === "checking" && (
        <>
          <ActivityIndicator size="large" color="#00D4AA" />
          <Text style={styles.title}>Verificando pagamento...</Text>
          <Text style={styles.subtitle}>
            Aguarde enquanto confirmamos sua assinatura
          </Text>
          <Text style={styles.attempt}>Tentativa {attempt} de 6</Text>
        </>
      )}

      {status === "success" && (
        <>
          <View style={styles.successIcon}>
            <MaterialIcons name="check-circle" size={64} color="#00D4AA" />
          </View>
          <Text style={styles.title}>Assinatura ativada!</Text>
          <Text style={styles.subtitle}>
            Redirecionando para o Dashboard...
          </Text>
        </>
      )}

      {status === "failed" && (
        <>
          <View style={styles.warningIcon}>
            <MaterialIcons name="schedule" size={64} color="#FFD700" />
          </View>
          <Text style={styles.title}>Verificação pendente</Text>
          <Text style={styles.subtitle}>
            O pagamento pode levar alguns instantes para ser processado.{"\n"}
            Use o botão "Já assinei" na tela seguinte.
          </Text>
        </>
      )}
    </View>
  );
}

// Import necessário para a verificação direta
import { getApiBaseUrl } from "@/constants/oauth";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    color: "#ECEDEE",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    color: "#8E8E93",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },
  attempt: {
    color: "#555555",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
  },
  successIcon: {
    marginBottom: 8,
  },
  warningIcon: {
    marginBottom: 8,
  },
});
