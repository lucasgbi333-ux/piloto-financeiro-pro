/**
 * Settings Screen
 * 
 * Tela de configurações do Piloto Financeiro Pro.
 * Inclui botão "Gerenciar Assinatura" para acessar o Stripe Billing Portal.
 */
import { useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/lib/supabase-auth-provider";
import { getApiBaseUrl } from "@/constants/oauth";
import * as WebBrowser from "expo-web-browser";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Validar formato de e-mail
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function SettingsScreen() {
  const colors = useColors();
  const { session, trial } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  
  const isEmailValid = email.length > 0 && isValidEmail(email);

  const handleManageSubscription = async () => {
    try {
      // Validar e-mail digitado
      if (!email.trim()) {
        setEmailError("Digite um e-mail");
        return;
      }
      
      if (!isValidEmail(email)) {
        setEmailError("E-mail inválido");
        return;
      }
      
      setEmailError("");
      
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

      // Chama o endpoint para criar uma sessão do Stripe Billing Portal com o e-mail digitado
      const res = await fetch(`${apiBase}/api/stripe/billing-portal-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        Alert.alert("Erro", error.error || "Não foi possível acessar o portal de assinatura. Verifique o e-mail.");
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

          {/* Email Input Field */}
          <View style={styles.emailContainer}>
            <TextInput
              style={[
                styles.emailInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: emailError ? colors.error : colors.border,
                },
              ]}
              placeholder="Digite seu e-mail de assinante"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            {emailError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{emailError}</Text>
            ) : null}
          </View>

          {/* Manage Subscription Button */}
          <Pressable
            onPress={handleManageSubscription}
            disabled={loading || !isEmailValid}
            style={({ pressed }) => [
              styles.subscriptionButton,
              {
                backgroundColor: isEmailValid ? colors.primary : colors.muted,
                opacity: pressed || loading || !isEmailValid ? 0.6 : 1,
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

        {/* Trial Status Section */}
        {trial.is_active && trial.days_remaining > 0 && (
          <View style={[styles.section, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Período de Teste</Text>
            <View style={[styles.trialInfo, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <MaterialIcons name="schedule" size={24} color={colors.primary} style={styles.trialIcon} />
              <View style={styles.trialContent}>
                <Text style={[styles.trialDays, { color: colors.primary }]}>{trial.days_remaining} dias restantes</Text>
                <Text style={[styles.trialDate, { color: colors.muted }]}>
                  Expira em {trial.trial_end ? new Date(trial.trial_end).toLocaleDateString("pt-BR") : "—"}
                </Text>
              </View>
            </View>
          </View>
        )}

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
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2022",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  headerIcon: {
    marginBottom: 4,
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
  emailContainer: {
    marginBottom: 16,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
  trialInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  trialIcon: {
    marginRight: 4,
  },
  trialContent: {
    flex: 1,
  },
  trialDays: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  trialDate: {
    fontSize: 13,
  },
});
