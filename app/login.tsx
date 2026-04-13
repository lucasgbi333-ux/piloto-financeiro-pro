import { useState, useRef, useEffect } from "react";
import {
  Text, View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useSupabaseAuth } from "@/lib/supabase-auth-provider";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type Mode = "login" | "signup" | "reset";

export default function LoginScreen() {
  const { signIn, signUp, resetPassword, signOut, session, subscription, subscriptionLoading, trial, trialLoading, createCheckout, checkSubscription, checkTrial } = useSupabaseAuth();
  const params = useLocalSearchParams<{ success?: string; canceled?: string }>();

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Handle Stripe redirect params
  useEffect(() => {
    if (params.success === "true") {
      setSuccessMsg("Pagamento aprovado! Faça login para acessar o app.");
      setMode("login");
      // Refresh subscription status
      checkSubscription();
    } else if (params.canceled === "true") {
      setErrorMsg("Pagamento não concluído. Você pode tentar novamente.");
    }
  }, [params.success, params.canceled]);

  // If user is logged in with trial or subscription, go to app
  useEffect(() => {
    if (session && !subscriptionLoading && !trialLoading) {
      // Allow access if: has active subscription OR has active trial
      if (subscription.ativo || trial.is_active) {
        router.replace("/(tabs)");
      }
    }
  }, [session, subscription.ativo, subscriptionLoading, trial.is_active, trialLoading]);

  const isValid = (() => {
    if (mode === "reset") return email.trim().length > 0;
    if (mode === "signup") return fullName.trim().length > 0 && email.trim().length > 0 && password.length >= 6;
    return email.trim().length > 0 && password.length >= 6;
  })();

  const hapticError = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };
  const hapticSuccess = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (mode === "login") {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMsg(error);
          hapticError();
        } else {
          hapticSuccess();
          // After login, subscription check will auto-trigger via useEffect
          // If subscribed → redirect to tabs
          // If not subscribed → show paywall (handled by the logged-in state below)
        }

      } else if (mode === "signup") {
        const { error, needsConfirmation } = await signUp(email.trim(), password, fullName.trim());
        if (error) {
          setErrorMsg(error);
          hapticError();
        } else if (needsConfirmation) {
          hapticSuccess();
          Alert.alert(
            "Conta criada!",
            "Enviamos um email de confirmação. Verifique sua caixa de entrada e clique no link para ativar sua conta.",
            [{ text: "OK", onPress: () => switchMode("login") }]
          );
        } else {
          hapticSuccess();
          // Session created, subscription check will auto-trigger
        }

      } else if (mode === "reset") {
        const { error } = await resetPassword(email.trim());
        if (error) {
          setErrorMsg(error);
          hapticError();
        } else {
          hapticSuccess();
          Alert.alert(
            "Email enviado!",
            "Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.",
            [{ text: "OK", onPress: () => switchMode("login") }]
          );
        }
      }
    } catch {
      setErrorMsg("Erro de conexão. Verifique sua internet e tente novamente.");
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setCheckoutLoading(true);
    setErrorMsg("");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const apiBase = getApiBaseUrl();
      const email = session?.user?.email;
      if (!email) {
        setErrorMsg("Email não encontrado. Faça login novamente.");
        return;
      }

      const res = await fetch(`${apiBase}/api/trial/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, user_id: session?.user?.id }),
      });

      if (res.ok) {
        hapticSuccess();
        // Refresh trial status
        await checkTrial();
        // Auto-redirect will happen via useEffect
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Erro ao iniciar trial");
        hapticError();
      }
    } catch (err) {
      setErrorMsg("Erro de conexão. Verifique sua internet.");
      hapticError();
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setErrorMsg("");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { url, error } = await createCheckout();
      if (error) {
        setErrorMsg(error);
        hapticError();
      } else if (url) {
        if (Platform.OS === "web") {
          window.location.href = url;
        } else {
          await Linking.openURL(url);
        }
      }
    } catch {
      setErrorMsg("Erro ao iniciar pagamento. Tente novamente.");
      hapticError();
    } finally {
      setCheckoutLoading(false);
    }
  };



  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setErrorMsg("");
    setSuccessMsg("");
    setPassword("");
    setFullName("");
  };

  const handlePaywallLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  // ─── PAYWALL: User is logged in but NOT subscribed ───
  if (session && !subscription.ativo && !subscriptionLoading) {
    const userName = session.user?.user_metadata?.full_name || session.user?.email?.split("@")[0] || "Motorista";

    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>Piloto Financeiro <Text style={styles.logoPro}>Pro</Text></Text>
            <Text style={styles.title}>Assinatura Necessária</Text>
            <Text style={styles.subtitle}>Olá, {userName}!</Text>
          </View>

          {/* Plan Card */}
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <MaterialIcons name="workspace-premium" size={32} color="#FFD700" />
              <Text style={styles.planTitle}>Plano Mensal</Text>
            </View>

            {/* Trial badge */}
            <View style={styles.trialBadge}>
              <MaterialIcons name="card-giftcard" size={16} color="#0A0A0A" />
              <Text style={styles.trialBadgeText}>7 dias grátis</Text>
            </View>

            <Text style={styles.planPrice}>
              R$ 6,99<Text style={styles.planPeriod}>/mês após o trial</Text>
            </Text>

            <View style={styles.planFeatures}>
              <PlanFeature text="Dashboard completo com métricas" />
              <PlanFeature text="Lançamentos diários ilimitados" />
              <PlanFeature text="Histórico e relatórios detalhados" />
              <PlanFeature text="Perfis Combustão e Elétrico" />
              <PlanFeature text="Caixinha de manutenção e reserva" />
              <PlanFeature text="Custos fixos e cálculo de lucro" />
            </View>

            {/* Trial Button */}
            <TouchableOpacity
              style={styles.subscribeBtn}
              onPress={handleStartTrial}
              activeOpacity={0.8}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <ActivityIndicator color="#0A0A0A" size="small" />
              ) : (
                <>
                  <MaterialIcons name="lock-open" size={20} color="#0A0A0A" />
                  <Text style={styles.subscribeBtnText}>Iniciar 7 Dias Grátis</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Refresh subscription status */}
            {verifyMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{verifyMsg}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.refreshBtn, verifyLoading && { opacity: 0.6 }]}
              onPress={async () => {
                if (verifyLoading) return;
                setVerifyLoading(true);
                setVerifyMsg("");
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await checkSubscription();
                setVerifyLoading(false);
                // If still not subscribed after checking, show message
                // (if subscribed, the useEffect above will redirect automatically)
                setVerifyMsg("Assinatura não encontrada. Se você acabou de assinar, aguarde alguns segundos e tente novamente.");
              }}
              activeOpacity={0.7}
              disabled={verifyLoading}
            >
              {verifyLoading ? (
                <ActivityIndicator color="#8E8E93" size="small" />
              ) : (
                <Text style={styles.refreshBtnText}>Já assinei — verificar novamente</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Error message */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Logout link */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handlePaywallLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>
                Sair da conta — <Text style={styles.linkTextAccent}>Trocar conta</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─── Loading subscription check ───
  if (session && subscriptionLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4AA" />
          <Text style={styles.loadingText}>Verificando assinatura...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // ─── LOGIN / SIGNUP / RESET FORM ───
  const title = mode === "login" ? "Entrar" : mode === "signup" ? "Criar Conta" : "Recuperar Senha";
  const subtitle = mode === "login"
    ? "Acesse sua conta para continuar"
    : mode === "signup"
    ? "Preencha os dados para criar sua conta"
    : "Informe seu email para receber o link";
  const btnLabel = mode === "login" ? "Entrar" : mode === "signup" ? "Criar Conta" : "Enviar Link";

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>Piloto Financeiro <Text style={styles.logoPro}>Pro</Text></Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {/* Success message from Stripe */}
          {successMsg ? (
            <View style={styles.successBox}>
              <MaterialIcons name="check-circle" size={18} color="#30D158" />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* Nome completo — apenas no cadastro */}
            {mode === "signup" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Completo</Text>
                <TextInput
                  ref={nameRef}
                  style={styles.input}
                  placeholder="Seu nome completo"
                  placeholderTextColor="#555"
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="name"
                  value={fullName}
                  onChangeText={(t) => { setFullName(t); setErrorMsg(""); }}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  editable={!loading}
                />
              </View>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#555"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrorMsg(""); }}
                returnKeyType={mode === "reset" ? "done" : "next"}
                onSubmitEditing={() => {
                  if (mode !== "reset") passwordRef.current?.focus();
                  else handleSubmit();
                }}
                editable={!loading}
              />
            </View>

            {/* Senha — oculta no modo reset */}
            {mode !== "reset" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#555"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setErrorMsg(""); }}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Mensagem de erro */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Botão principal */}
            <TouchableOpacity
              style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={!isValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#0A0A0A" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{btnLabel}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Links de navegação */}
          <View style={styles.footer}>
            {mode === "login" && (
              <>
                <TouchableOpacity onPress={() => switchMode("reset")} activeOpacity={0.7}>
                  <Text style={styles.linkText}>Esqueci minha senha</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity onPress={() => switchMode("signup")} activeOpacity={0.7}>
                  <Text style={styles.linkTextAccent}>Criar conta</Text>
                </TouchableOpacity>
              </>
            )}
            {mode === "signup" && (
              <TouchableOpacity onPress={() => switchMode("login")} activeOpacity={0.7}>
                <Text style={styles.linkText}>
                  Já tenho conta — <Text style={styles.linkTextAccent}>Entrar</Text>
                </Text>
              </TouchableOpacity>
            )}
            {mode === "reset" && (
              <TouchableOpacity onPress={() => switchMode("login")} activeOpacity={0.7}>
                <Text style={styles.linkText}>
                  Voltar para <Text style={styles.linkTextAccent}>Login</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function PlanFeature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <MaterialIcons name="check-circle" size={18} color="#00D4AA" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ECEDEE",
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  logoPro: {
    color: "#00D4AA",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ECEDEE",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9BA1A6",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#ECEDEE",
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  passwordRow: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 36,
  },
  eyeText: {
    fontSize: 18,
  },
  errorBox: {
    backgroundColor: "rgba(255,69,58,0.12)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.25)",
  },
  errorText: {
    color: "#FF453A",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
  successBox: {
    backgroundColor: "rgba(48,209,88,0.12)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(48,209,88,0.25)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  successText: {
    color: "#30D158",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: "#00D4AA",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: "#0A0A0A",
    fontSize: 17,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
    gap: 16,
  },
  linkText: {
    color: "#8E8E93",
    fontSize: 14,
  },
  linkTextAccent: {
    color: "#00D4AA",
    fontWeight: "600",
    fontSize: 14,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: "#2C2C2E",
  },
  // Paywall styles
  planCard: {
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
    marginBottom: 20,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#00D4AA",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  trialBadgeText: {
    color: "#0A0A0A",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  planTitle: {
    color: "#FFD700",
    fontSize: 22,
    fontWeight: "700",
  },
  planPrice: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 20,
  },
  planPeriod: {
    color: "#8E8E93",
    fontSize: 16,
    fontWeight: "500",
  },
  planFeatures: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    color: "#ECEDEE",
    fontSize: 14,
    fontWeight: "500",
  },
  subscribeBtn: {
    backgroundColor: "#00D4AA",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  subscribeBtnText: {
    color: "#0A0A0A",
    fontSize: 17,
    fontWeight: "700",
  },
  refreshBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  refreshBtnText: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: "#8E8E93",
    fontSize: 14,
    fontWeight: "500",
  },
});
