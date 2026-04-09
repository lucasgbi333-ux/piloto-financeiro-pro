/**
 * Rota /checkout-success
 *
 * Captura o deep link pilotofinanceiro://checkout-success após o pagamento/trial no Stripe.
 * Chama o endpoint /api/stripe/activate que consulta o Stripe diretamente pelo email,
 * confirma a assinatura ativa/trialing e atualiza ativo=true no Supabase.
 * Após ativar, redireciona automaticamente para o Dashboard.
 */
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSupabaseAuth } from "@/lib/supabase-auth-provider";
import { getApiBaseUrl } from "@/constants/oauth";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function CheckoutSuccessScreen() {
  const { checkSubscription, session } = useSupabaseAuth();
  const [status, setStatus] = useState<"checking" | "success" | "failed">("checking");
  const [attempt, setAttempt] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Confirmando sua assinatura...");

  useEffect(() => {
    let cancelled = false;

    const activateAndRedirect = async () => {
      // Se não tem sessão, redireciona para login
      if (!session?.user?.email) {
        router.replace("/login");
        return;
      }

      const email = session.user.email;
      const apiBase = getApiBaseUrl();
      const maxAttempts = 6;
      const delayMs = 2000;

      for (let i = 0; i < maxAttempts; i++) {
        if (cancelled) return;

        setAttempt(i + 1);
        setStatusMsg(i === 0
          ? "Confirmando sua assinatura no Stripe..."
          : `Verificando... (tentativa ${i + 1} de ${maxAttempts})`
        );

        try {
          // Chama o endpoint /activate que consulta o Stripe diretamente
          // e atualiza ativo=true no Supabase se encontrar assinatura ativa/trialing
          const res = await fetch(`${apiBase}/api/stripe/activate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.ativo === true) {
              if (cancelled) return;
              setStatus("success");
              setStatusMsg("Assinatura ativada com sucesso!");

              // Atualiza o estado global de assinatura
              await checkSubscription();

              // Aguarda um momento para mostrar o feedback visual
              await new Promise((resolve) => setTimeout(resolve, 1500));
              if (cancelled) return;

              // Redireciona para o Dashboard
              router.replace("/(tabs)");
              return;
            }
          }
        } catch (err) {
          console.warn("[CheckoutSuccess] Activate attempt failed:", err);
        }

        // Aguarda antes da próxima tentativa
        if (i < maxAttempts - 1 && !cancelled) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      // Se após todas as tentativas não ativou, mostra mensagem e vai para paywall
      if (!cancelled) {
        setStatus("failed");
        setStatusMsg("Não foi possível confirmar automaticamente. Use o botão abaixo.");
        await new Promise((resolve) => setTimeout(resolve, 3500));
        if (!cancelled) {
          router.replace("/login");
        }
      }
    };

    activateAndRedirect();

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
          <Text style={styles.subtitle}>{statusMsg}</Text>
          {attempt > 1 && (
            <Text style={styles.attempt}>Tentativa {attempt} de 6</Text>
          )}
        </>
      )}

      {status === "success" && (
        <>
          <View style={styles.iconWrap}>
            <MaterialIcons name="check-circle" size={72} color="#00D4AA" />
          </View>
          <Text style={styles.titleSuccess}>Acesso liberado!</Text>
          <Text style={styles.subtitle}>Redirecionando para o Dashboard...</Text>
        </>
      )}

      {status === "failed" && (
        <>
          <View style={styles.iconWrap}>
            <MaterialIcons name="schedule" size={72} color="#FFD700" />
          </View>
          <Text style={styles.title}>Verificação pendente</Text>
          <Text style={styles.subtitle}>
            O pagamento pode levar alguns instantes.{"\n"}
            Use o botão "Já assinei" na próxima tela.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    marginBottom: 8,
  },
  title: {
    color: "#ECEDEE",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  titleSuccess: {
    color: "#00D4AA",
    fontSize: 24,
    fontWeight: "800",
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
    marginTop: 4,
  },
});
