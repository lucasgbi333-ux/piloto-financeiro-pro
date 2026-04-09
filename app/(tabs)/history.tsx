import { FlatList, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import type { Transaction, TransactionType } from "@/lib/types";
import { useState } from "react";

type FilterType = "TODOS" | TransactionType;

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

export default function HistoryScreen() {
  const { state } = useApp();
  const { transactions } = state;
  const [filter, setFilter] = useState<FilterType>("TODOS");

  const filters: FilterType[] = ["TODOS", "GANHO", "CUSTO", "AJUSTE"];
  const filterLabels: Record<FilterType, string> = {
    TODOS: "Todos",
    GANHO: "Ganhos",
    CUSTO: "Custos",
    AJUSTE: "Ajustes",
  };

  const filtered = filter === "TODOS"
    ? [...transactions].sort((a, b) => b.date - a.date)
    : [...transactions].filter((t) => t.type === filter).sort((a, b) => b.date - a.date);

  const totalGanhos = transactions.filter((t) => t.type === "GANHO").reduce((s, t) => s + t.amount, 0);
  const totalCustos = transactions.filter((t) => t.type === "CUSTO").reduce((s, t) => s + t.amount, 0);
  const saldo = totalGanhos - totalCustos;

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.item}>
      <View style={[styles.itemIcon, { backgroundColor: typeColor(item.type) + "22" }]}>
        <Text style={[styles.itemIconText, { color: typeColor(item.type) }]}>
          {typeIcon(item.type)}
        </Text>
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemDescription} numberOfLines={1}>{item.description}</Text>
        <Text style={styles.itemDate}>{fmtDate(item.date)} · {typeLabel(item.type)}</Text>
      </View>
      <Text style={[styles.itemAmount, { color: typeColor(item.type) }]}>
        {item.type === "CUSTO" ? "-" : "+"}{fmt(item.amount)}
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico</Text>
        <Text style={styles.subtitle}>Todas as movimentações registradas no app.</Text>

        {/* Resumo financeiro */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Ganhos</Text>
            <Text style={[styles.summaryValue, { color: "#30D158" }]}>{fmt(totalGanhos)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Custos</Text>
            <Text style={[styles.summaryValue, { color: "#FF453A" }]}>{fmt(totalCustos)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Saldo</Text>
            <Text style={[styles.summaryValue, { color: saldo >= 0 ? "#30D158" : "#FF453A" }]}>
              {saldo >= 0 ? "+" : ""}{fmt(saldo)}
            </Text>
          </View>
        </View>

        {/* Filtros */}
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                {filterLabels[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Nenhuma movimentação</Text>
          <Text style={styles.emptySubtitle}>
            As transações aparecem aqui automaticamente quando você salva um dia na aba Operacional ou atualiza os Custos Fixos.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "700", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { color: "#8E8E93", fontSize: 15, lineHeight: 22, marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: "#111111", borderRadius: 12,
    padding: 10, borderWidth: 1, borderColor: "#1C1C1E",
  },
  summaryLabel: { color: "#8E8E93", fontSize: 11, fontWeight: "500", marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: "#111111",
    borderWidth: 1, borderColor: "#1C1C1E",
  },
  filterBtnActive: { backgroundColor: "#0A84FF", borderColor: "#0A84FF" },
  filterBtnText: { color: "#8E8E93", fontSize: 13, fontWeight: "500" },
  filterBtnTextActive: { color: "#FFFFFF", fontWeight: "600" },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  item: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#111111", borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#1C1C1E",
  },
  itemIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  itemIconText: { fontSize: 18, fontWeight: "700" },
  itemBody: { flex: 1, marginRight: 8 },
  itemDescription: { color: "#FFFFFF", fontSize: 14, fontWeight: "500", marginBottom: 2 },
  itemDate: { color: "#8E8E93", fontSize: 12 },
  itemAmount: { fontSize: 14, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySubtitle: { color: "#8E8E93", fontSize: 14, lineHeight: 20, textAlign: "center" },
});
