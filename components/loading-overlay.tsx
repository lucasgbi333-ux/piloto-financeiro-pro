import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

export interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
}

/**
 * Premium loading overlay with CircularProgress on OLED Black background.
 * Used during payment validation and subscription activation.
 */
export function LoadingOverlay({
  visible,
  message = "Validando pagamento...",
  subMessage = "Seu acesso está sendo liberado",
}: LoadingOverlayProps) {
  const colors = useColors();

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Outer ring with subtle glow effect */}
      <View style={[styles.outerRing, { borderColor: colors.primary }]} />

      {/* Spinner */}
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />

      {/* Main message */}
      <Text style={[styles.message, { color: colors.foreground }]}>{message}</Text>

      {/* Sub-message */}
      {subMessage && (
        <Text style={[styles.subMessage, { color: colors.muted }]}>{subMessage}</Text>
      )}

      {/* Animated dots */}
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <View style={[styles.dot, { backgroundColor: colors.primary, opacity: 0.6 }]} />
        <View style={[styles.dot, { backgroundColor: colors.primary, opacity: 0.3 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  outerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    position: "absolute",
    opacity: 0.2,
  },
  spinner: {
    marginBottom: 24,
  },
  message: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
