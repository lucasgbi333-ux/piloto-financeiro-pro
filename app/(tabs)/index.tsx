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
  const { dashboard, fixedCostResult, operationalResult, dailyRecords } = state;

  // Lucro líquido do dia = ganho - custo combustível - custo fixo diário
  const lucroLiquido = dashboard.dailyProfit; // já calculado com lucroDiaLiquido no contexto

  // Custo/km total = combustível + fixos diluídos por km
  const custoPorKmTotal = operationalResult.custoPorKmTotal;

  // Último dia lançado para exibir no dashboard
  const ultimoDia = dailyRecords.length > 0
    ? [...dailyRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const ultimoDiaLucroLiquido = ultimoDia
    ? ultimoDia.ganho - ultimoDia.custo - fixedCostResult.custoFixoDiario
    : null;

  const hasData =
    dashboard.minPerKm > 0 ||
    dashboard.requiredDaily > 0 ||
    fixedCostResult.custoFixoDiario > 0;

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
            <View style={[styles.iconCircle, { backgroundColor: "rgba(0,212,170,0.15)" }]}>
              <MaterialIcons name="verified" size={22} color="#00D4AA" />
            </View>
            <Text style={styles.cardLabel}>VALOR MÍNIMO POR KM</Text>
          </View>
          <Text style={[styles.cardValue, { color: "#00D4AA" }]}>
            {fmtKm(dashboard.minPerKm)}
          </Text>
          <Text style={styles.cardHint}>Aceite corridas acima deste valor</Text>
        </View>

        {/* Card 2: Meta Diária */}
        <View style={[styles.card, styles.cardBlue]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(10,132,255,0.15)" }]}>
              <MaterialIcons name="flag" size={22} color="#0A84FF" />
            </View>
            <Text style={styles.cardLabel}>META DIÁRIA</Text>
          </View>
          <Text style={[styles.cardValue, { color: "#0A84FF" }]}>
            {fmt(dashboard.requiredDaily)}
          </Text>
          <Text style={styles.cardHint}>Necessário para cobrir custos fixos</Text>
        </View>

        {/* Card 3: Lucro Líquido do Último Dia */}
        {ultimoDia && ultimoDiaLucroLiquido !== null && (
          <View style={[styles.card, ultimoDiaLucroLiquido >= 0 ? styles.cardGold : styles.cardRed]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, {
                backgroundColor: ultimoDiaLucroLiquido >= 0 ? "rgba(255,215,0,0.15)" : "rgba(255,69,58,0.15)"
              }]}>
                <MaterialIcons
                  name={ultimoDiaLucroLiquido >= 0 ? "trending-up" : "trending-down"}
                  size={22}
                  color={ultimoDiaLucroLiquido >= 0 ? "#FFD700" : "#FF453A"}
                />
              </View>
              <Text style={styles.cardLabel}>LUCRO LÍQUIDO — {ultimoDia.date}</Text>
            </View>
            <Text style={[styles.cardValue, { color: ultimoDiaLucroLiquido >= 0 ? "#FFD700" : "#FF453A" }]}>
              {ultimoDiaLucroLiquido >= 0 ? "+" : ""}{fmt(ultimoDiaLucroLiquido)}
            </Text>
            <Text style={styles.cardHint}>
              Ganho {fmt(ultimoDia.ganho)} − Combustível {fmt(ultimoDia.custo)} − Fixos {fmt(fixedCostResult.custoFixoDiario)}
            </Text>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Fixo/Dia</Text>
            <Text style={styles.statValue}>{fmt(fixedCostResult.custoFixoDiario)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Custo/KM Total</Text>
            <Text style={[styles.statValue, { color: "#FF9500" }]}>
              {custoPorKmTotal > 0 ? `R$ ${custoPorKmTotal.toFixed(3).replace(".", ",")}` : "—"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Dias</Text>
            <Text style={styles.statValue}>{dailyRecords.length}</Text>
          </View>
        </View>

        {/* Detalhamento do custo fixo diário */}
        {fixedCostResult.custoFixoDiario > 0 && (
          <View style={styles.fixedBreakdown}>
            <Text style={styles.fixedBreakdownTitle}>Composição do Custo Fixo Diário</Text>
            <View style={styles.fixedBreakdownRow}>
              <Text style={styles.fixedBreakdownLabel}>Custo Mensal Total</Text>
              <Text style={styles.fixedBreakdownValue}>{fmt(fixedCostResult.custoMensalTotal)}</Text>
            </View>
            <View style={styles.fixedBreakdownRow}>
              <Text style={styles.fixedBreakdownLabel}>Diluído por Dia (÷30)</Text>
              <Text style={[styles.fixedBreakdownValue, { color: "#FF9500" }]}>
                {fmt(fixedCostResult.custoFixoDiario)}
              </Text>
            </View>
            <Text style={styles.fixedBreakdownHint}>
              IPVA + Financiamento/Aluguel + Seguro + Internet + Outros, convertidos para custo diário.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "baseline", marginBottom: 28, gap: 8 },
  greeting: { color: "#FFFFFF", fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { color: "#00D4AA", fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
  onboardingCard: {
    backgroundColor: "#111111", borderRadius: 16, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: "#1C1C1E",
    alignItems: "center", gap: 8,
  },
  onboardingTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  onboardingText: { color: "#8E8E93", fontSize: 14, textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: "#111111", borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1,
  },
  cardGreen: { borderColor: "rgba(0,212,170,0.2)" },
  cardBlue: { borderColor: "rgba(10,132,255,0.2)" },
  cardGold: { borderColor: "rgba(255,215,0,0.2)" },
  cardRed: { borderColor: "rgba(255,69,58,0.2)" },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  cardLabel: { color: "#8E8E93", fontSize: 11, fontWeight: "600", letterSpacing: 1 },
  cardValue: { fontSize: 34, fontWeight: "800", letterSpacing: -1, marginBottom: 4 },
  cardHint: { color: "#555555", fontSize: 13, fontWeight: "500" },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: "#111111", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#1C1C1E", alignItems: "center",
  },
  statLabel: {
    color: "#8E8E93", fontSize: 10, fontWeight: "500",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, textAlign: "center",
  },
  statValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", textAlign: "center" },
  fixedBreakdown: {
    backgroundColor: "#111111", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#FF9500" + "33",
  },
  fixedBreakdownTitle: { color: "#FF9500", fontSize: 13, fontWeight: "700", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  fixedBreakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  fixedBreakdownLabel: { color: "#8E8E93", fontSize: 13 },
  fixedBreakdownValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  fixedBreakdownHint: { color: "#555555", fontSize: 12, lineHeight: 18, marginTop: 6 },
});
