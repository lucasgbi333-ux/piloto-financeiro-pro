/**
 * Settings Screen
 * 
 * Tela de configurações do Piloto Financeiro Pro.
 * Inclui botão "Gerenciar Assinatura" para acessar o Stripe Billing Portal.
 */
import { useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/lib/supabase-auth-provider";
import { getApiBaseUrl } from "@/constants/oauth";
import * as WebBrowser from "expo-web-browser";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function SettingsScreen() {
  const colors = useColors();
  const { session } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    try {
      if (!session?.user) {
        Alert.alert("Erro", "Sessão não encontrada. Faça login novamente.");
        return;
      }

      setLoading(true);
      const apiBase = getApiBaseUrl();

      // Get the session token for authentication
      const token = session.access_token;
      if (!token) {
        Alert.alert("Erro", "Token de autenticação não encontrado.");
        return;
      }

      // Chama o endpoint para criar uma sessão do Stripe Billing Portal
      const res = await fetch(`${apiBase}/api/stripe/billing-portal-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        Alert.alert("Erro", error.error || "Não foi possível acessar o portal de assinatura");
        return;
      }

      const data = await res.json();
      if (!data.url) {
        Alert.alert("Erro", "URL do portal não foi gerada");
        return;
      }

      // Abre o portal no navegador
      await WebBrowser.openBrowserAsync(data.url);
    } catch (err) {
      console.error("[Settings] Manage subscription error:", err);
      Alert.alert("Erro", "Falha ao acessar o portal de assinatura");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <MaterialIcons name="settings" size={24} color={colors.primary} style={styles.headerIcon} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Configurações</Text>
        </View>

        {/* Subscription Section */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Assinatura</Text>

          {/* Manage Subscription Button */}
          <Pressable
            onPress={handleManageSubscription}
            disabled={loading}
            style={({ pressed }) => [
              styles.subscriptionButton,
              {
                backgroundColor: colors.primary,
                opacity: pressed || loading ? 0.8 : 1,
              },
            ]}
          >
            <View style={styles.buttonContent}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} style={styles.buttonIcon} />
              ) : (
                <MaterialIcons name="credit-card" size={20} color={colors.background} style={styles.buttonIcon} />
              )}
              <Text style={[styles.buttonText, { color: colors.background }]}>
                {loading ? "Carregando..." : "Gerenciar Assinatura"}
              </Text>
            </View>
          </Pressable>

          <Text style={[styles.subscriptionDescription, { color: colors.muted }]}>
            Altere seu plano, atualize seu método de pagamento ou cancele sua assinatura.
          </Text>
        </View>

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sobre</Text>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Versão do App</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>1.0.14</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{session?.user?.email || "—"}</Text>
          </View>
        </View>

        {/* Footer Spacer */}
        <View style={{ flex: 1 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2022",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2022",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  subscriptionButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  subscriptionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
});
