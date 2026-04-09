import { Text, View } from "react-native";
import { StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ComponentProps } from "react";

interface ResultCardProps {
  icon: ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
}

export function ResultCard({
  icon,
  title,
  value,
  subtitle,
  accentColor = "#00D4AA",
}: ResultCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: accentColor }]}>
      <View style={styles.header}>
        <MaterialIcons name={icon} size={20} color={accentColor} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "#1C1C1E",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#8E8E93",
    fontSize: 13,
    marginTop: 4,
  },
});
