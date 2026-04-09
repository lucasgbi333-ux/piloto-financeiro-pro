import { Text, View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AnimatedBarChart } from "@/components/animated-bar-chart";
import { useApp } from "@/lib/app-context";
import type { PeriodFilter, DailyRecord } from "@/lib/types";

const FILTER_OPTIONS: PeriodFilter[] = ["DAY", "WEEK", "MONTH"];
const FILTER_LABELS = ["Dia", "Semana", "Mês"];

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function DayRow({ record, custoFixoDiario }: { record: DailyRecord; custoFixoDiario: number }) {
  const lucroLiquido = record.ganho - record.custo - custoFixoDiario;
  const isPositive = lucroLiquido >= 0;
  return (
    <View style={styles.dayRow}>
      <View style={styles.dayLeft}>
        <Text style={styles.dayDate}>{record.date}</Text>
        <Text style={styles.dayDetail}>
          {record.kmRodado.toFixed(0)} km · Ganho: {fmt(record.ganho)} · Custo: {fmt(record.custo)}
        </Text>
        <Text style={styles.dayFixo}>Fixos do dia: {fmt(custoFixoDiario)}</Text>
      </View>
      <View style={styles.dayRight}>
        <Text style={[styles.dayProfit, { color: isPositive ? "#30D158" : "#FF453A" }]}>
          {isPositive ? "+" : ""}{fmt(lucroLiquido)}
        </Text>
        <Text style={styles.dayProfitLabel}>líquido</Text>
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const { state, setPeriodFilter } = useApp();
  const { fixedCostResult, dailyRecords } = state;
  const filterIndex = FILTER_OPTIONS.indexOf(state.periodFilter);

  const custoFixoDiario = fixedCostResult.custoFixoDiario;

  // Totais gerais
  const totalGanho = dailyRecords.reduce((s, r) => s + r.ganho, 0);
  const totalCustoCombustivel = dailyRecords.reduce((s, r) => s + r.custo, 0);
  const totalCustoFixos = custoFixoDiario * dailyRecords.length;
  const totalKm = dailyRecords.reduce((s, r) => s + r.kmRodado, 0);
  const totalLucroLiquido = totalGanho - totalCustoCombustivel - totalCustoFixos;

  // Dias ordenados do mais recente ao mais antigo
  const sortedDays = [...dailyRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Relatórios</Text>
        <Text style={styles.subtitle}>Acompanhe seus resultados por período.</Text>

        {/* Filtro de período */}
        <View style={styles.filterContainer}>
          <SegmentedControl
            options={FILTER_LABELS}
            selectedIndex={filterIndex}
            onSelect={(i) => setPeriodFilter(FILTER_OPTIONS[i])}
          />
        </View>

        {/* Cards de resumo */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Ganho</Text>
            <Text style={[styles.summaryValue, { color: "#30D158" }]}>{fmt(totalGanho)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>KM Total</Text>
            <Text style={styles.summaryValue}>{totalKm.toFixed(0)} km</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Custo Combustível</Text>
            <Text style={[styles.summaryValue, { color: "#FF9500" }]}>{fmt(totalCustoCombustivel)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Custo Fixos</Text>
            <Text style={[styles.summaryValue, { color: "#FF453A" }]}>{fmt(totalCustoFixos)}</Text>
          </View>
        </View>
        <View style={styles.liquidCard}>
          <Text style={styles.liquidLabel}>Lucro Líquido Total</Text>
          <Text style={[styles.liquidValue, { color: totalLucroLiquido >= 0 ? "#30D158" : "#FF453A" }]}>
            {totalLucroLiquido >= 0 ? "+" : ""}{fmt(totalLucroLiquido)}
          </Text>
          <Text style={styles.liquidHint}>Ganho − Combustível − Fixos diluídos ({fmt(custoFixoDiario)}/dia)</Text>
        </View>

        {/* Gráfico animado por período */}
        {state.reports.length > 0 && (
          <View style={styles.chartContainer}>
            <AnimatedBarChart data={state.reports} height={220} />
          </View>
        )}

        {/* Lista de períodos agrupados */}
        {state.reports.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Por Período</Text>
            {state.reports.map((item) => (
              <View key={item.period} style={styles.periodRow}>
                <View style={styles.periodLeft}>
                  <Text style={styles.periodLabel}>{item.period}</Text>
                  <Text style={styles.periodDetail}>
                    {item.totalKm.toFixed(0)} km · Custo: {fmt(item.totalCost)}
                  </Text>
                </View>
                <Text style={[styles.periodProfit, { color: item.totalProfit >= 0 ? "#30D158" : "#FF453A" }]}>
                  {item.totalProfit >= 0 ? "+" : ""}{fmt(item.totalProfit)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Lista de dias lançados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dias Lançados ({sortedDays.length})</Text>
          {sortedDays.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>Nenhum dia lançado</Text>
              <Text style={styles.emptySubtitle}>
                Use a aba Lançamentos para registrar seus dias de trabalho.
              </Text>
            </View>
          ) : (
            sortedDays.map((record) => (
              <DayRow key={record.id} record={record} custoFixoDiario={custoFixoDiario} />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "700", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { color: "#8E8E93", fontSize: 15, lineHeight: 22, marginBottom: 20 },
  filterContainer: { marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  summaryCard: {
    flex: 1, backgroundColor: "#111111", borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: "#1C1C1E",
  },
  summaryLabel: { color: "#8E8E93", fontSize: 11, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  liquidCard: {
    backgroundColor: "#111111", borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: "#00D4AA44",
    alignItems: "center",
  },
  liquidLabel: { color: "#8E8E93", fontSize: 13, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  liquidValue: { fontSize: 32, fontWeight: "700", marginBottom: 4 },
  liquidHint: { color: "#555555", fontSize: 12, textAlign: "center" },
  chartContainer: { marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  periodRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#111111", borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#1C1C1E",
  },
  periodLeft: { flex: 1, marginRight: 12 },
  periodLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginBottom: 2 },
  periodDetail: { color: "#8E8E93", fontSize: 12 },
  periodProfit: { fontSize: 17, fontWeight: "700" },
  dayRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#111111", borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#1C1C1E",
  },
  dayLeft: { flex: 1, marginRight: 12 },
  dayDate: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginBottom: 2 },
  dayDetail: { color: "#8E8E93", fontSize: 12, marginBottom: 2 },
  dayFixo: { color: "#FF9500", fontSize: 11 },
  dayRight: { alignItems: "flex-end" },
  dayProfit: { fontSize: 17, fontWeight: "700" },
  dayProfitLabel: { color: "#8E8E93", fontSize: 11 },
  empty: { alignItems: "center", paddingVertical: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { color: "#8E8E93", fontSize: 14, lineHeight: 20, textAlign: "center" },
});
