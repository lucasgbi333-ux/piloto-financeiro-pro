import { ScrollView, Text, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { DailyRecord } from "@/lib/types";

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function fmtKm(val: number): string {
  return `R$ ${val.toFixed(3).replace(".", ",")}/km`;
}

// ===== CARD DE RESUMO POR PERFIL =====
function ProfileDashCard({
  type,
  records,
  custoFixoDiario,
  pctCaixinha,
  operationalResult,
}: {
  type: "COMBUSTAO" | "ELETRICO";
  records: DailyRecord[];
  custoFixoDiario: number;
  pctCaixinha: number;
  operationalResult: { custoPorKmTotal: number; lucroDiaLiquido: number };
}) {
  const isEletrico = type === "ELETRICO";
  const color = isEletrico ? "#30D158" : "#FF9500";
  const icon = isEletrico ? "🔋" : "⛽";
  const label = isEletrico ? "Elétrico" : "Combustão";

  const totalGanho = records.reduce((s, r) => s + r.ganho, 0);
  const totalCusto = records.reduce((s, r) => s + r.custo, 0);
  const totalFixos = custoFixoDiario * records.length;
  const totalLiquido = totalGanho - totalCusto - totalFixos;
  const totalKm = records.reduce((s, r) => s + r.kmRodado, 0);

  // Último dia deste perfil
  const ultimoDia = records.length > 0
    ? [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  const caixinhaUltimoDia = ultimoDia ? ultimoDia.ganho * pctCaixinha : 0;
  const ultimoDiaLucro = ultimoDia
    ? ultimoDia.ganho - ultimoDia.custo - custoFixoDiario - caixinhaUltimoDia
    : null;

  return (
    <View style={[styles.profileCard, { borderColor: color + "44" }]}>
      {/* Header do perfil */}
      <View style={styles.profileCardHeader}>
        <Text style={styles.profileCardIcon}>{icon}</Text>
        <Text style={[styles.profileCardTitle, { color }]}>{label}</Text>
        <Text style={styles.profileCardDays}>{records.length} dias</Text>
      </View>

      {records.length === 0 ? (
        <Text style={styles.profileCardEmpty}>Nenhum lançamento ainda</Text>
      ) : (
        <>
          {/* Totais */}
          <View style={styles.profileCardGrid}>
            <View style={styles.profileCardCell}>
              <Text style={styles.profileCardCellLabel}>Ganho Total</Text>
              <Text style={[styles.profileCardCellValue, { color: "#30D158" }]}>{fmt(totalGanho)}</Text>
            </View>
            <View style={styles.profileCardCell}>
              <Text style={styles.profileCardCellLabel}>{isEletrico ? "Recarga" : "Combustível"}</Text>
              <Text style={[styles.profileCardCellValue, { color: "#FF453A" }]}>{fmt(totalCusto)}</Text>
            </View>
            <View style={styles.profileCardCell}>
              <Text style={styles.profileCardCellLabel}>KM Total</Text>
              <Text style={styles.profileCardCellValue}>{totalKm.toFixed(0)} km</Text>
            </View>
            <View style={styles.profileCardCell}>
              <Text style={styles.profileCardCellLabel}>Fixos</Text>
              <Text style={[styles.profileCardCellValue, { color: "#FF9500" }]}>{fmt(totalFixos)}</Text>
            </View>
          </View>

          {/* Lucro líquido total */}
          <View style={[styles.profileCardLiquid, { borderColor: totalLiquido >= 0 ? "#00D4AA33" : "#FF453A33" }]}>
            <Text style={styles.profileCardLiquidLabel}>Lucro Líquido Total</Text>
            <Text style={[styles.profileCardLiquidValue, { color: totalLiquido >= 0 ? "#00D4AA" : "#FF453A" }]}>
              {totalLiquido >= 0 ? "+" : ""}{fmt(totalLiquido)}
            </Text>
          </View>

          {/* Último dia deste perfil */}
          {ultimoDia && ultimoDiaLucro !== null && (
            <View style={styles.profileCardLastDay}>
              <Text style={styles.profileCardLastDayTitle}>Último dia: {ultimoDia.date}</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Ganho bruto</Text>
                <Text style={[styles.breakdownValue, { color: "#30D158" }]}>+{fmt(ultimoDia.ganho)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{isEletrico ? "Recarga" : "Combustível"}</Text>
                <Text style={[styles.breakdownValue, { color: "#FF453A" }]}>−{fmt(ultimoDia.custo)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Custos fixos</Text>
                <Text style={[styles.breakdownValue, { color: "#FF9500" }]}>−{fmt(custoFixoDiario)}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                <Text style={[styles.breakdownLabel, { color: "#FFFFFF", fontWeight: "700" }]}>Lucro líquido</Text>
                <Text style={[styles.breakdownValue, { color: ultimoDiaLucro >= 0 ? "#00D4AA" : "#FF453A", fontSize: 15 }]}>
                  {ultimoDiaLucro >= 0 ? "+" : ""}{fmt(ultimoDiaLucro)}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const { state } = useApp();
  const {
    dashboard, fixedCostResult, operationalResult,
    dailyRecords, dailyRecordsCombustao, dailyRecordsEletrico, caixinha,
  } = state;

  const custoPorKmTotal = operationalResult.custoPorKmTotal;

  // Percentual total da caixinha (configurável pelo usuário)
  const pctCaixinha = (caixinha.config.percentualManutencao + caixinha.config.percentualReserva) / 100;

  const hasData =
    dashboard.minPerKm > 0 ||
    dashboard.requiredDaily > 0 ||
    fixedCostResult.custoFixoDiario > 0;

  const hasCombustao = dailyRecordsCombustao.length > 0;
  const hasEletrico = dailyRecordsEletrico.length > 0;

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Piloto Financeiro</Text>
          <Text style={styles.subtitleAccent}>Pro</Text>
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

        {/* Seção: Resultados por Perfil */}
        {(hasCombustao || hasEletrico) && (
          <>
            <Text style={styles.sectionTitle}>Resultados por Perfil</Text>
            <ProfileDashCard
              type="COMBUSTAO"
              records={dailyRecordsCombustao}
              custoFixoDiario={fixedCostResult.custoFixoDiario}
              pctCaixinha={pctCaixinha}
              operationalResult={operationalResult}
            />
            <ProfileDashCard
              type="ELETRICO"
              records={dailyRecordsEletrico}
              custoFixoDiario={fixedCostResult.custoFixoDiario}
              pctCaixinha={pctCaixinha}
              operationalResult={operationalResult}
            />
          </>
        )}

        {/* Card Caixinha */}
        {caixinha.saldoTotal > 0 && (
          <View style={[styles.card, styles.cardCaixinha]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: "rgba(255,149,0,0.15)" }]}>
                <Text style={{ fontSize: 18 }}>🪙</Text>
              </View>
              <Text style={styles.cardLabel}>CAIXINHA ACUMULADA</Text>
            </View>
            <Text style={[styles.cardValue, { color: "#FF9500" }]}>
              {fmt(caixinha.saldoTotal)}
            </Text>
            <View style={styles.caixinhaRow}>
              <Text style={styles.caixinhaItem}>🔧 Manutenção: {fmt(caixinha.saldoManutencao)}</Text>
              <Text style={styles.caixinhaItem}>🛡️ Reserva: {fmt(caixinha.saldoReserva)}</Text>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Fixo/Dia</Text>
            <Text style={styles.statValue}>{fmt(fixedCostResult.custoFixoDiario)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{state.activeVehicleType === "ELETRICO" ? "Custo/KM (Elét.)" : "Custo/KM"}</Text>
            <Text style={[styles.statValue, { color: "#FF9500" }]}>
              {custoPorKmTotal > 0 ? `R$ ${custoPorKmTotal.toFixed(3).replace(".", ",")}` : "—"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Dias</Text>
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
  subtitleAccent: { color: "#00D4AA", fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },
  onboardingCard: {
    backgroundColor: "#111111", borderRadius: 16, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: "#1C1C1E",
    alignItems: "center", gap: 8,
  },
  onboardingTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  onboardingText: { color: "#8E8E93", fontSize: 14, textAlign: "center", lineHeight: 20 },
  sectionTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginBottom: 12, marginTop: 4 },
  card: {
    backgroundColor: "#111111", borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1,
  },
  cardGreen: { borderColor: "rgba(0,212,170,0.2)" },
  cardBlue: { borderColor: "rgba(10,132,255,0.2)" },
  cardGold: { borderColor: "rgba(255,215,0,0.2)" },
  cardRed: { borderColor: "rgba(255,69,58,0.2)" },
  cardCaixinha: { borderColor: "rgba(255,149,0,0.2)" },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  cardLabel: { color: "#8E8E93", fontSize: 11, fontWeight: "600", letterSpacing: 1 },
  cardValue: { fontSize: 34, fontWeight: "800", letterSpacing: -1, marginBottom: 12 },
  cardHint: { color: "#555555", fontSize: 13, fontWeight: "500" },
  caixinhaRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  caixinhaItem: { color: "#8E8E93", fontSize: 13 },
  // Profile cards
  profileCard: {
    backgroundColor: "#111111", borderRadius: 18, padding: 16,
    marginBottom: 14, borderWidth: 1,
  },
  profileCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  profileCardIcon: { fontSize: 20 },
  profileCardTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  profileCardDays: { color: "#8E8E93", fontSize: 12 },
  profileCardEmpty: { color: "#555555", fontSize: 13, textAlign: "center", paddingVertical: 12 },
  profileCardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  profileCardCell: {
    width: "47%", backgroundColor: "#000000", borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: "#1C1C1E",
  },
  profileCardCellLabel: { color: "#8E8E93", fontSize: 10, fontWeight: "500", marginBottom: 3 },
  profileCardCellValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  profileCardLiquid: {
    borderRadius: 10, padding: 12, borderWidth: 1,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10,
  },
  profileCardLiquidLabel: { color: "#8E8E93", fontSize: 12, fontWeight: "600" },
  profileCardLiquidValue: { fontSize: 18, fontWeight: "800" },
  profileCardLastDay: {
    backgroundColor: "#000000", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "#1C1C1E", gap: 4,
  },
  profileCardLastDayTitle: { color: "#8E8E93", fontSize: 11, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownTotal: { borderTopWidth: 1, borderTopColor: "#1C1C1E", marginTop: 4, paddingTop: 6 },
  breakdownLabel: { color: "#8E8E93", fontSize: 13 },
  breakdownValue: { fontSize: 13, fontWeight: "600" },
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
  fixedBreakdownTitle: {
    color: "#FF9500", fontSize: 13, fontWeight: "700",
    marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5,
  },
  fixedBreakdownRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 6,
  },
  fixedBreakdownLabel: { color: "#8E8E93", fontSize: 13 },
  fixedBreakdownValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  fixedBreakdownHint: { color: "#555555", fontSize: 12, lineHeight: 18, marginTop: 6 },
});
