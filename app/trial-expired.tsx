import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useSupabaseAuth } from "@/lib/supabase-auth-provider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect } from "react";

export default function TrialExpiredScreen() {
  const { session, subscription, trial, createCheckout } = useSupabaseAuth();

  // If user has subscription or active trial, redirect to app
  useEffect(() => {
    if (session && (subscription.ativo || trial?.is_active)) {
      router.replace("/(tabs)");
    }
  }, [session, subscription.ativo, trial?.is_active]);

  const handleSubscribe = async () => {
    const { url, error } = await createCheckout();
    if (error) {
      alert("Erro ao iniciar pagamento: " + error);
    } else if (url) {
      // Open URL in browser for Stripe checkout
      if (typeof window !== "undefined") {
        window.location.href = url;
      }
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <MaterialIcons name="schedule" size={80} color="#FF6B00" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Período de Teste Expirado</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Seus 7 dias de acesso gratuito terminaram. Assine agora para continuar usando o Piloto Financeiro Pro!
        </Text>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <FeatureItem text="Dashboard completo com métricas" />
          <FeatureItem text="Lançamentos diários ilimitados" />
          <FeatureItem text="Histórico e relatórios detalhados" />
          <FeatureItem text="Perfis Combustão e Elétrico" />
          <FeatureItem text="Caixinha de manutenção e reserva" />
          <FeatureItem text="Custos fixos e cálculo de lucro" />
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.price}>R$ 6,99</Text>
          <Text style={styles.period}>/mês</Text>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe} activeOpacity={0.8}>
          <MaterialIcons name="credit-card" size={20} color="#0A0A0A" />
          <Text style={styles.subscribeBtnText}>Assinar Agora</Text>
        </TouchableOpacity>

        {/* Logout link */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            // Can't use hook here, just navigate to login
            router.replace("/login");
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <MaterialIcons name="check-circle" size={20} color="#00D4AA" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1C1C1E",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: 32,
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#ECEDEE",
    flex: 1,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "baseline",
    marginBottom: 32,
    gap: 4,
  },
  price: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FF6B00",
  },
  period: {
    fontSize: 14,
    color: "#8E8E93",
  },
  subscribeBtn: {
    width: "100%",
    height: 56,
    backgroundColor: "#FF6B00",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  subscribeBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0A0A0A",
  },
  logoutBtn: {
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
});
