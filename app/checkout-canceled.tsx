/**
 * Rota /checkout-canceled
 * 
 * Captura o deep link pilotofinanceiro://checkout-canceled quando o usuário
 * cancela o pagamento no Stripe. Mostra mensagem e redireciona para o login/paywall.
 */
import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function CheckoutCanceledScreen() {
  useEffect(() => {
    // Redireciona para login/paywall após 2.5 segundos
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <MaterialIcons name="cancel" size={64} color="#FF453A" />
      <Text style={styles.title}>Pagamento cancelado</Text>
      <Text style={styles.subtitle}>
        Você pode tentar novamente a qualquer momento.
      </Text>
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
});
