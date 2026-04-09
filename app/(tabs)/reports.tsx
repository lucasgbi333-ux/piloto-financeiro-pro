import { Text, View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AnimatedBarChart } from "@/components/animated-bar-chart";
import { useApp } from "@/lib/app-context";
import type { PeriodFilter, ReportItem, Transaction, TransactionType } from "@/lib/types";
import { useState } from "react";

const FILTER_OPTIONS: PeriodFilter[] = ["DAY", "WEEK", "MONTH"];
const FILTER_LABELS = ["Dia", "Semana", "Mês"];

type HistoryFilter = "TODOS" | TransactionType;

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function typeColor(type: TransactionType): string {
  if (type === "GANHO") return "#30D158";
  if (type === "CUSTO") return "#FF453A";
  return "#FF9500";
}

function typeIcon(type: TransactionType): string {
  if (type === "GANHO") return "↑";
  if (type === "CUSTO") return "↓";
  return "⟳";
}

function typeLabel(type: TransactionType): string {
  if (type === "GANHO") return "Ganho";
  if (type === "CUSTO") return "Custo";
  return "Ajuste";
}

function ReportRow({ item }: { item: ReportItem }) {
  const isPositive = item.totalProfit >= 0;
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowPeriod}>{item.period}</Text>
        <Text style={styles.rowDetail}>
          {item.totalKm.toFixed(0)} km · Custo: {fmt(item.totalCost)}
        </Text>
      </View>
      <Text style={[styles.rowProfit, { color: isPositive ? "#30D158" : "#FF453A" }]}>
        {isPositive ? "+" : ""}{fmt(item.totalProfit)}
      </Text>
    </View>
  );
}

function TransactionRow({ item }: { item: Transaction }) {
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: typeColor(item.type) + "22" }]}>
        <Text style={[styles.txIconText, { color: typeColor(item.type) }]}>
          {typeIcon(item.type)}
        </Text>
      </View>
      <View style={styles.txBody}>
        <Text style={styles.txDescription} numberOfLines={1}>{item.description}</Text>
        <Text style={styles.txDate}>{fmtDate(item.date)} · {typeLabel(item.type)}</Text>
      </View>
      <Text style={[styles.txAmount, { color: typeColor(item.type) }]}>
        {item.type === "CUSTO" ? "-" : "+"}{fmt(item.amount)}
      </Text>
    </View>
  );
}

export default function ReportsScreen() {
  const { state, setPeriodFilter } = useApp();
  const { transactions } = state;
  const filterIndex = FILTER_OPTIONS.indexOf(state.periodFilter);

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("TODOS");
  const historyFilters: HistoryFilter[] = ["TODOS", "GANHO", "CUSTO", "AJUSTE"];
  const historyFilterLabels: Record<HistoryFilter, string> = {
    TODOS: "Todos", GANHO: "Ganhos", CUSTO: "Custos", AJUSTE: "Ajustes",
  };

  const totalProfit = state.reports.reduce((sum, r) => sum + r.totalProfit, 0);
  const totalKm = state.reports.reduce((sum, r) => sum + r.totalKm, 0);
  const totalCost = state.reports.reduce((sum, r) => sum + r.totalCost, 0);

  const totalGanhos = transactions.filter((t) => t.type === "GANHO").reduce((s, t) => s + t.amount, 0);
  const totalCustos = transactions.filter((t) => t.type === "CUSTO").reduce((s, t) => s + t.amount, 0);
  const saldo = totalGanhos - totalCustos;

  const filteredTx = historyFilter === "TODOS"
    ? [...transactions].sort((a, b) => b.date - a.date)
    : [...transactions].filter((t) => t.type === historyFilter).sort((a, b) => b.date - a.date);

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Relatórios</Text>
        <Text style={styles.subtitle}>Acompanhe seus resultados por período e todas as movimentações.</Text>

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
            <Text style={styles.summaryLabel}>Lucro Total</Text>
            <Text style={[styles.summaryValue, { color: totalProfit >= 0 ? "#30D158" : "#FF453A" }]}>
              {fmt(totalProfit)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>KM Total</Text>
            <Text style={styles.summaryValue}>{totalKm.toFixed(0)} km</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Custo Total</Text>
            <Text style={[styles.summaryValue, { color: "#FF453A" }]}>{fmt(totalCost)}</Text>
          </View>
        </View>

        {/* Gráfico animado */}
        {state.reports.length > 0 && (
          <View style={styles.chartContainer}>
            <AnimatedBarChart data={state.reports} height={220} />
          </View>
        )}

        {/* Lista de registros por período */}
        {state.reports.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Registros por Período</Text>
            {state.reports.map((item) => (
              <ReportRow key={item.period} item={item} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Nenhum registro ainda</Text>
            <Text style={styles.emptySubtitle}>
              Salve um dia na aba Perfis para ver os relatórios aqui.
            </Text>
          </View>
        )}

        {/* Divisor */}
        <View style={styles.divider} />

        {/* Histórico de Transações */}
        <Text style={styles.sectionTitle}>Histórico de Movimentações</Text>

        {/* Resumo financeiro */}
        <View style={styles.txSummaryRow}>
          <View style={styles.txSummaryCard}>
            <Text style={styles.txSummaryLabel}>Ganhos</Text>
            <Text style={[styles.txSummaryValue, { color: "#30D158" }]}>{fmt(totalGanhos)}</Text>
          </View>
          <View style={styles.txSummaryCard}>
            <Text style={styles.txSummaryLabel}>Custos</Text>
            <Text style={[styles.txSummaryValue, { color: "#FF453A" }]}>{fmt(totalCustos)}</Text>
          </View>
          <View style={styles.txSummaryCard}>
            <Text style={styles.txSummaryLabel}>Saldo</Text>
            <Text style={[styles.txSummaryValue, { color: saldo >= 0 ? "#30D158" : "#FF453A" }]}>
              {saldo >= 0 ? "+" : ""}{fmt(saldo)}
            </Text>
          </View>
        </View>

        {/* Filtros de transação */}
        <View style={styles.txFilterRow}>
          {historyFilters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.txFilterBtn, historyFilter === f && styles.txFilterBtnActive]}
              onPress={() => setHistoryFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.txFilterText, historyFilter === f && styles.txFilterTextActive]}>
                {historyFilterLabels[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista de transações */}
        {filteredTx.length === 0 ? (
          <View style={styles.emptyTx}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Nenhuma movimentação</Text>
            <Text style={styles.emptySubtitle}>
              As transações aparecem aqui quando você salva um dia na aba Perfis.
            </Text>
          </View>
        ) : (
          filteredTx.map((item) => (
            <TransactionRow key={item.id} item={item} />
          ))
        )}
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
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: "#111111", borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: "#1C1C1E",
  },
  summaryLabel: {
    color: "#8E8E93", fontSize: 11, fontWeight: "500",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
  },
  summaryValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  chartContainer: { marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#111111", borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#1C1C1E",
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowPeriod: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginBottom: 2 },
  rowDetail: { color: "#8E8E93", fontSize: 12 },
  rowProfit: { fontSize: 17, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#1C1C1E", marginVertical: 24 },
  txSummaryRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  txSummaryCard: {
    flex: 1, backgroundColor: "#111111", borderRadius: 12,
    padding: 10, borderWidth: 1, borderColor: "#1C1C1E",
  },
  txSummaryLabel: { color: "#8E8E93", fontSize: 11, fontWeight: "500", marginBottom: 4 },
  txSummaryValue: { fontSize: 14, fontWeight: "700" },
  txFilterRow: { flexDirection: "row", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  txFilterBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: "#111111",
    borderWidth: 1, borderColor: "#1C1C1E",
  },
  txFilterBtnActive: { backgroundColor: "#0A84FF", borderColor: "#0A84FF" },
  txFilterText: { color: "#8E8E93", fontSize: 13, fontWeight: "500" },
  txFilterTextActive: { color: "#FFFFFF", fontWeight: "600" },
  txRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#111111", borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#1C1C1E",
  },
  txIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  txIconText: { fontSize: 18, fontWeight: "700" },
  txBody: { flex: 1, marginRight: 8 },
  txDescription: { color: "#FFFFFF", fontSize: 14, fontWeight: "500", marginBottom: 2 },
  txDate: { color: "#8E8E93", fontSize: 12 },
  txAmount: { fontSize: 14, fontWeight: "700" },
  emptyChart: { alignItems: "center", paddingVertical: 32 },
  emptyTx: { alignItems: "center", paddingVertical: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { color: "#8E8E93", fontSize: 14, lineHeight: 20, textAlign: "center" },
});
