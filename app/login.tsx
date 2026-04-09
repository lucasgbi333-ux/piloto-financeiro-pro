import { useState, useRef } from "react";
import {
  Text, View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useSupabaseAuth } from "@/lib/supabase-auth-provider";
import * as Haptics from "expo-haptics";

type Mode = "login" | "signup" | "reset";

export default function LoginScreen() {
  const { signIn, signUp, resetPassword } = useSupabaseAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

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
          router.replace("/(tabs)");
        }

      } else if (mode === "signup") {
        const { error, needsConfirmation } = await signUp(email.trim(), password, fullName.trim());
        if (error) {
          setErrorMsg(error);
          hapticError();
        } else if (needsConfirmation) {
          hapticSuccess();
          Alert.alert(
            "Conta criada! ✉️",
            "Enviamos um email de confirmação. Verifique sua caixa de entrada e clique no link para ativar sua conta.",
            [{ text: "OK", onPress: () => switchMode("login") }]
          );
        } else {
          // Sessão criada automaticamente (email confirmation desabilitado)
          hapticSuccess();
          router.replace("/(tabs)");
        }

      } else if (mode === "reset") {
        const { error } = await resetPassword(email.trim());
        if (error) {
          setErrorMsg(error);
          hapticError();
        } else {
          hapticSuccess();
          Alert.alert(
            "Email enviado! ✉️",
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

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setErrorMsg("");
    setPassword("");
    setFullName("");
  };

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
    marginBottom: 40,
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
});
