/**
 * PermissionBanner
 *
 * Componente de banner de alerta para permissões necessárias do overlay.
 * Exibido na tela Radar de Ganhos quando as permissões estão ausentes.
 */

import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

const C = {
  orange: "#FF6B00",
  orangeDark: "#CC5500",
  orangeBg: "#1A0D00",
  orangeBorder: "#3D1A00",
  yellow: "#FBBF24",
  yellowBg: "#1A1400",
  yellowBorder: "#3D3000",
  red: "#EF4444",
  redBg: "#1A0000",
  redBorder: "#3D0000",
  text: "#ECEDEE",
  textMuted: "#8E8E93",
  card: "#111214",
  cardBorder: "#1C1C1E",
};

type BannerVariant = "warning" | "error" | "info";

interface PermissionBannerProps {
  variant?: BannerVariant;
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

function getBannerColors(variant: BannerVariant) {
  switch (variant) {
    case "error":
      return { bg: C.redBg, border: C.redBorder, accent: C.red };
    case "warning":
      return { bg: C.yellowBg, border: C.yellowBorder, accent: C.yellow };
    case "info":
    default:
      return { bg: C.orangeBg, border: C.orangeBorder, accent: C.orange };
  }
}

export function PermissionBanner({
  variant = "warning",
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: PermissionBannerProps) {
  const colors = getBannerColors(variant);

  function handleAction() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onAction();
  }

  function handleSecondary() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSecondary?.();
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}22` }]}>
          <MaterialIcons name={icon as any} size={22} color={colors.accent} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      <Text style={styles.description}>{description}</Text>

      <View style={styles.actions}>
        <Pressable
          onPress={handleAction}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: colors.accent },
            pressed && { opacity: 0.8 },
          ]}
        >
          <MaterialIcons name="settings" size={16} color="#000" />
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </Pressable>

        {secondaryLabel && onSecondary && (
          <Pressable
            onPress={handleSecondary}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.accent }]}>
              {secondaryLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  description: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryBtn: {
    paddingVertical: 9,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
