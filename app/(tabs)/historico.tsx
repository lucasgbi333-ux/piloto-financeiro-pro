import {
  Text, View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import type { PeriodFilter, DailyRecord } from "@/lib/types";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from "react-native-reanimated";
import { useEffect, useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import { InputField } from "@/components/ui/input-field";

const SCREEN_W = Dimensions.get("window").width;
const CHART_H = 180;
const BAR_GAP = 4;

const FILTER_OPTIONS: { key: PeriodFilter; label: string }[] = [
  { key: "DAY", label: "Dia" },
  { key: "WEEK", label: "Semana" },
  { key: "MONTH", label: "Mês" },
  { key: "YEAR", label: "Ano" },
];

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

// ===== BARRA ANIMADA =====
function AnimatedBar({
  value, maxValue, color, label, index,
}: {
  value: number; maxValue: number; color: string; label: string; index: number;
}) {
  const height = useSharedValue(0);
  const targetH = maxValue > 0 ? Math.max((Math.abs(value) / maxValue) * CHART_H, 4) : 4;

  useEffect(() => {
    height.value = withDelay(index * 60, withTiming(targetH, { duration: 500 }));
  }, [targetH]);

  const animStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <View style={styles.barWrapper}>
      <View style={styles.barContainer}>
        <Animated.View style={[styles.bar, { backgroundColor: color }, animStyle]} />
      </View>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ===== GRÁFICO DINÂMICO =====
function DynamicBarChart({ data, custoFixoDiario }: { data: ReturnType<typeof useApp>["state"]["reports"]; custoFixoDiario: number }) {
  const [mode, setMode] = useState<"liquido" | "ganho" | "custo">("liquido");

  const values = useMemo(() => {
    return data.map((item) => {
      if (mode === "liquido") return (item.totalLiquid ?? item.totalProfit);
      if (mode === "ganho") return (item.totalGanho ?? item.totalProfit + item.totalCost);
      return item.totalCost;
    });
  }, [data, mode]);

  const maxValue = Math.max(...values.map(Math.abs), 1);

  const modeColors: Record<string, string> = {
    liquido: "#00D4AA",
    ganho: "#30D158",
    custo: "#FF453A",
  };

  return (
    <View style={styles.chartCard}>
      {/* Toggle de modo */}
      <View style={styles.chartModeRow}>
        {(["liquido", "ganho", "custo"] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.chartModeBtn, mode === m && { backgroundColor: modeColors[m] + "22", borderColor: modeColors[m] }]}
            onPress={() => setMode(m)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chartModeBtnText, mode === m && { color: modeColors[m] }]}>
              {m === "liquido" ? "Líquido" : m === "ganho" ? "Ganho" : "Custo"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Barras */}
      {data.length === 0 ? (
        <View style={styles.chartEmpty}>
          <Text style={styles.chartEmptyText}>Nenhum dado para exibir</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
          <View style={[styles.chartBars, { minWidth: data.length * (32 + BAR_GAP) }]}>
            {data.map((item, i) => (
              <AnimatedBar
                key={item.period}
                value={values[i]}
                maxValue={maxValue}
                color={values[i] >= 0 ? modeColors[mode] : "#FF453A"}
                label={item.period.length > 8 ? item.period.slice(5) : item.period}
                index={i}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Legenda */}
      <Text style={styles.chartLegend}>
        {mode === "liquido"
          ? `Lucro líquido = Ganho − Combustível − Fixos (${fmt(custoFixoDiario)}/dia)`
          : mode === "ganho"
          ? "Total recebido nas corridas"
          : "Custo com combustível/recarga"}
      </Text>
    </View>
  );
}

// ===== MODAL DE EDIÇÃO DO DIA =====
function EditDayModal({
  record,
  onSave,
  onDelete,
  onClose,
}: {
  record: DailyRecord;
  onSave: (r: DailyRecord) => void;
  onDelete: (date: string) => void;
  onClose: () => void;
}) {
  const [km, setKm] = useState(record.kmRodado);
  const [ganho, setGanho] = useState(record.ganho);
  const [custo, setCusto] = useState(record.custo);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>✏️ Editar {record.date}</Text>
          <InputField label="KM Rodados" value={km} onChangeValue={setKm} suffix="km" />
          <InputField label="Ganho do Dia" value={ganho} onChangeValue={setGanho} suffix="R$" />
          <InputField label="Custo Combustível/Recarga" value={custo} onChangeValue={setCusto} suffix="R$" />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => { onDelete(record.date); onClose(); }} activeOpacity={0.8}>
              <Text style={styles.deleteBtnText}>Excluir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => {
              onSave({ ...record, kmRodado: km, ganho, custo, updatedAt: Date.now() });
              onClose();
            }} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ===== TELA PRINCIPAL =====
export default function HistoricoScreen() {
  const { state, setPeriodFilter, addDailyRecord, removeDailyRecord } = useApp();
  const { fixedCostResult, dailyRecords } = state;
  const custoFixoDiario = fixedCostResult.custoFixoDiario;

  const filterIndex = FILTER_OPTIONS.findIndex((f) => f.key === state.periodFilter);
  const [editRecord, setEditRecord] = useState<DailyRecord | null>(null);

  // Totais consolidados
  const totalGanho = dailyRecords.reduce((s, r) => s + r.ganho, 0);
  const totalCusto = dailyRecords.reduce((s, r) => s + r.custo, 0);
  const totalFixos = custoFixoDiario * dailyRecords.length;
  const totalKm = dailyRecords.reduce((s, r) => s + r.kmRodado, 0);
  const totalLiquido = totalGanho - totalCusto - totalFixos;

  // Dias ordenados do mais recente ao mais antigo
  const sortedDays = useMemo(
    () => [...dailyRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [dailyRecords]
  );

  const handleEdit = (record: DailyRecord) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditRecord(record);
  };

  const handleSave = (updated: DailyRecord) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addDailyRecord(updated);
  };

  const handleDelete = (date: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    removeDailyRecord(date);
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Histórico</Text>

        {/* Filtros */}
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterBtn, filterIndex === i && styles.filterBtnActive]}
              onPress={() => setPeriodFilter(opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterBtnText, filterIndex === i && styles.filterBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gráfico dinâmico */}
        <DynamicBarChart data={state.reports} custoFixoDiario={custoFixoDiario} />

        {/* Cards de resumo total */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Ganho</Text>
            <Text style={[styles.summaryValue, { color: "#30D158" }]}>{fmt(totalGanho)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>KM Total</Text>
            <Text style={styles.summaryValue}>{totalKm.toFixed(0)} km</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Combust./Recarga</Text>
            <Text style={[styles.summaryValue, { color: "#FF9500" }]}>{fmt(totalCusto)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Fixos</Text>
            <Text style={[styles.summaryValue, { color: "#FF453A" }]}>{fmt(totalFixos)}</Text>
          </View>
        </View>

        {/* Card de lucro líquido total */}
        <View style={[styles.liquidCard, { borderColor: totalLiquido >= 0 ? "#00D4AA44" : "#FF453A44" }]}>
          <Text style={styles.liquidLabel}>LUCRO LÍQUIDO TOTAL</Text>
          <Text style={[styles.liquidValue, { color: totalLiquido >= 0 ? "#00D4AA" : "#FF453A" }]}>
            {totalLiquido >= 0 ? "+" : ""}{fmt(totalLiquido)}
          </Text>
          <Text style={styles.liquidHint}>{dailyRecords.length} dias · {fmt(custoFixoDiario)}/dia de fixos</Text>
        </View>

        {/* Lista de períodos agrupados */}
        {state.reports.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Por {FILTER_OPTIONS[filterIndex]?.label ?? "Período"}</Text>
            {state.reports.map((item) => {
              const liq = item.totalLiquid ?? item.totalProfit;
              return (
                <View key={item.period} style={styles.periodRow}>
                  <View style={styles.periodLeft}>
                    <Text style={styles.periodLabel}>{item.period}</Text>
                    <Text style={styles.periodDetail}>
                      {item.totalKm.toFixed(0)} km · Ganho: {fmt(item.totalGanho ?? 0)} · Custo: {fmt(item.totalCost)}
                    </Text>
                    {item.count && item.count > 1 && (
                      <Text style={styles.periodCount}>{item.count} dias</Text>
                    )}
                  </View>
                  <Text style={[styles.periodProfit, { color: liq >= 0 ? "#30D158" : "#FF453A" }]}>
                    {liq >= 0 ? "+" : ""}{fmt(liq)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Lista de dias individuais com edição */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dias Lançados ({sortedDays.length})</Text>
          {sortedDays.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>Nenhum dia lançado</Text>
              <Text style={styles.emptySubtitle}>Use a aba Lançamentos para registrar seus dias.</Text>
            </View>
          ) : (
            sortedDays.map((record) => {
              const lucroLiq = record.ganho - record.custo - custoFixoDiario;
              return (
                <View key={record.id} style={styles.dayRow}>
                  <View style={styles.dayLeft}>
                    <Text style={styles.dayDate}>{record.date}</Text>
                    <Text style={styles.dayDetail}>
                      {record.kmRodado.toFixed(0)} km · Ganho: {fmt(record.ganho)} · Custo: {fmt(record.custo)}
                    </Text>
                    <Text style={styles.dayFixo}>Fixos: {fmt(custoFixoDiario)}</Text>
                  </View>
                  <View style={styles.dayRight}>
                    <Text style={[styles.dayProfit, { color: lucroLiq >= 0 ? "#30D158" : "#FF453A" }]}>
                      {lucroLiq >= 0 ? "+" : ""}{fmt(lucroLiq)}
                    </Text>
                    <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(record)} activeOpacity={0.7}>
                      <Text style={styles.editBtnText}>✏️ Editar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal de edição */}
      {editRecord && (
        <EditDayModal
          record={editRecord}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditRecord(null)}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "700", letterSpacing: -0.5, marginBottom: 20 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "#111111", borderWidth: 1, borderColor: "#1C1C1E",
    alignItems: "center",
  },
  filterBtnActive: { backgroundColor: "#00D4AA22", borderColor: "#00D4AA" },
  filterBtnText: { color: "#8E8E93", fontSize: 13, fontWeight: "600" },
  filterBtnTextActive: { color: "#00D4AA" },
  // Gráfico
  chartCard: {
    backgroundColor: "#111111", borderRadius: 16, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: "#1C1C1E",
  },
  chartModeRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  chartModeBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: "#2C2C2E", alignItems: "center",
  },
  chartModeBtnText: { color: "#8E8E93", fontSize: 12, fontWeight: "600" },
  chartScroll: { maxHeight: CHART_H + 28 },
  chartBars: { flexDirection: "row", alignItems: "flex-end", height: CHART_H + 28, paddingBottom: 24 },
  barWrapper: { width: 32, marginHorizontal: BAR_GAP / 2, alignItems: "center" },
  barContainer: { width: "100%", height: CHART_H, justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 4, minHeight: 4 },
  barLabel: { color: "#555555", fontSize: 8, marginTop: 4, textAlign: "center" },
  chartEmpty: { height: 60, alignItems: "center", justifyContent: "center" },
  chartEmptyText: { color: "#555555", fontSize: 14 },
  chartLegend: { color: "#555555", fontSize: 11, marginTop: 8, lineHeight: 16 },
  // Resumo
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  summaryCard: {
    width: "47%", backgroundColor: "#111111", borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: "#1C1C1E",
  },
  summaryLabel: { color: "#8E8E93", fontSize: 11, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  liquidCard: {
    backgroundColor: "#111111", borderRadius: 14, padding: 16,
    marginBottom: 16, borderWidth: 1, alignItems: "center",
  },
  liquidLabel: { color: "#8E8E93", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  liquidValue: { fontSize: 30, fontWeight: "800", marginBottom: 4 },
  liquidHint: { color: "#555555", fontSize: 12, textAlign: "center" },
  // Seções
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
  periodCount: { color: "#555555", fontSize: 11, marginTop: 2 },
  periodProfit: { fontSize: 16, fontWeight: "700" },
  // Dias
  dayRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#111111", borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#1C1C1E",
  },
  dayLeft: { flex: 1, marginRight: 12 },
  dayDate: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginBottom: 2 },
  dayDetail: { color: "#8E8E93", fontSize: 12, marginBottom: 2 },
  dayFixo: { color: "#FF9500", fontSize: 11 },
  dayRight: { alignItems: "flex-end", gap: 6 },
  dayProfit: { fontSize: 16, fontWeight: "700" },
  editBtn: {
    backgroundColor: "#0A84FF22", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "#0A84FF44",
  },
  editBtnText: { color: "#0A84FF", fontSize: 12, fontWeight: "600" },
  // Empty
  empty: { alignItems: "center", paddingVertical: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { color: "#8E8E93", fontSize: 14, lineHeight: 20, textAlign: "center" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#111111", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: "#333333", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginBottom: 16 },
  modalBtns: { flexDirection: "row", gap: 8, marginTop: 16 },
  deleteBtn: {
    flex: 1, backgroundColor: "#FF453A22", borderRadius: 12,
    paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#FF453A44",
  },
  deleteBtnText: { color: "#FF453A", fontSize: 14, fontWeight: "600" },
  cancelBtn: {
    flex: 1, backgroundColor: "#1C1C1E", borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  cancelBtnText: { color: "#8E8E93", fontSize: 14, fontWeight: "600" },
  saveBtn: {
    flex: 2, backgroundColor: "#00D4AA", borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  saveBtnText: { color: "#000000", fontSize: 14, fontWeight: "700" },
});
