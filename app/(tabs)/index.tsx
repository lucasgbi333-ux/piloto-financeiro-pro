import { ScrollView, Text, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function fmtKm(val: number): string {
  return `R$ ${val.toFixed(3).replace(".", ",")}/km`;
}

export default function DashboardScreen() {
  const { state } = useApp();
  const { dashboard } = state;

  const hasData =
    dashboard.minPerKm > 0 ||
    dashboard.requiredDaily > 0 ||
    dashboard.dailyProfit !== 0;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Piloto Financeiro</Text>
          <Text style={styles.subtitle}>Pro</Text>
        </View>

        {!hasData && (
          <View style={styles.onboardingCard}>
            <MaterialIcons name="info-outline" size={24} color="#0A84FF" />
            <Text style={styles.onboardingTitle}>Bem-vindo!</Text>
            <Text style={styles.onboardingText}>
              Configure seus custos fixos e registre seu dia de trabalho para ver os resultados aqui.
            </Text>
          </View>
        )}

        {/* Card 1: Valor Mínimo por KM */}
        <View style={[styles.card, styles.cardGreen]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(0, 212, 170, 0.15)" }]}>
              <MaterialIcons name="verified" size={22} color="#00D4AA" />
            </View>
            <Text style={styles.cardLabel}>VALOR MÍNIMO POR KM</Text>
          </View>
          <Text style={[styles.cardValue, { color: "#00D4AA" }]}>
            {fmtKm(dashboard.minPerKm)}
          </Text>
          <Text style={styles.cardHint}>
            Aceite corridas acima deste valor
          </Text>
        </View>

        {/* Card 2: Meta Diária */}
        <View style={[styles.card, styles.cardBlue]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(10, 132, 255, 0.15)" }]}>
              <MaterialIcons name="flag" size={22} color="#0A84FF" />
            </View>
            <Text style={styles.cardLabel}>META DIÁRIA</Text>
          </View>
          <Text style={[styles.cardValue, { color: "#0A84FF" }]}>
            {fmt(dashboard.requiredDaily)}
          </Text>
          <Text style={styles.cardHint}>
            Necessário para cobrir custos fixos
          </Text>
        </View>

        {/* Card 3: Lucro do Dia */}
        <View
          style={[
            styles.card,
            dashboard.dailyProfit >= 0 ? styles.cardGold : styles.cardRed,
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor:
                    dashboard.dailyProfit >= 0
                      ? "rgba(255, 215, 0, 0.15)"
                      : "rgba(255, 69, 58, 0.15)",
                },
              ]}
            >
              <MaterialIcons
                name={dashboard.dailyProfit >= 0 ? "trending-up" : "trending-down"}
                size={22}
                color={dashboard.dailyProfit >= 0 ? "#FFD700" : "#FF453A"}
              />
            </View>
            <Text style={styles.cardLabel}>LUCRO DO DIA</Text>
          </View>
          <Text
            style={[
              styles.cardValue,
              {
                color: dashboard.dailyProfit >= 0 ? "#FFD700" : "#FF453A",
              },
            ]}
          >
            {dashboard.dailyProfit >= 0 ? "+" : ""}
            {fmt(dashboard.dailyProfit)}
          </Text>
          <Text style={styles.cardHint}>
            {dashboard.dailyProfit >= 0
              ? "Lucro líquido do dia"
              : "Prejuízo — revise seus custos"}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Custo Fixo/Dia</Text>
            <Text style={styles.statValue}>
              {fmt(state.fixedCostResult.custoDiarioNecessario)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Custo/KM</Text>
            <Text style={styles.statValue}>
              {state.operationalResult.custoPorKm.toFixed(3).replace(".", ",")}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Registros</Text>
            <Text style={styles.statValue}>
              {state.dailyRecords.length}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 28,
    gap: 8,
  },
  greeting: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#00D4AA",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  onboardingCard: {
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1C1C1E",
    alignItems: "center",
    gap: 8,
  },
  onboardingTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  onboardingText: {
    color: "#8E8E93",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardGreen: {
    borderColor: "rgba(0, 212, 170, 0.2)",
  },
  cardBlue: {
    borderColor: "rgba(10, 132, 255, 0.2)",
  },
  cardGold: {
    borderColor: "rgba(255, 215, 0, 0.2)",
  },
  cardRed: {
    borderColor: "rgba(255, 69, 58, 0.2)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cardLabel: {
    color: "#8E8E93",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 4,
  },
  cardHint: {
    color: "#555555",
    fontSize: 13,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#111111",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1C1C1E",
    alignItems: "center",
  },
  statLabel: {
    color: "#8E8E93",
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
