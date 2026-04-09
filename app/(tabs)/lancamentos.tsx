import {
  Text, View, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, TextInput,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { InputField } from "@/components/ui/input-field";
import * as Haptics from "expo-haptics";
import { useState, useMemo } from "react";
import type { DailyRecord } from "@/lib/types";

const WEEK_DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function dateStr(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export default function LancamentosScreen() {
  const { state, recordDayWithTransactions, removeDailyRecord } = useApp();
  const { dailyRecords, activeProfile, fixedCostResult } = state;

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Modal de lançamento
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [kmRodado, setKmRodado] = useState(0);
  const [ganho, setGanho] = useState(0);
  const [gastoAbastecimento, setGastoAbastecimento] = useState(0);

  // Modal de detalhe do dia
  const [detailDate, setDetailDate] = useState<string | null>(null);

  const recordMap = useMemo(() => {
    const map = new Map<string, DailyRecord>();
    for (const r of dailyRecords) map.set(r.date, r);
    return map;
  }, [dailyRecords]);

  // Gera os dias do calendário para o mês atual
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Completa para múltiplo de 7
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const openModal = (day?: number) => {
    const ds = day ? dateStr(viewYear, viewMonth, day) : todayStr();
    setSelectedDate(ds);
    // Pré-preenche com registro existente OU com dados do Operacional
    const existing = recordMap.get(ds);
    if (existing) {
      setKmRodado(existing.kmRodado);
      setGanho(existing.ganho);
      setGastoAbastecimento(existing.custo);
    } else {
      // Usa dados da aba Operacional como ponto de partida
      const op = state.operationalInput;
      setKmRodado(op.kmRodadoDia > 0 ? op.kmRodadoDia : 0);
      setGanho(op.ganhoDia > 0 ? op.ganhoDia : 0);
      setGastoAbastecimento(op.gastoAbastecimento > 0 ? op.gastoAbastecimento : 0);
    }
    setModalVisible(true);
  };

  const handleSave = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = Date.now();
    const custoPorKm = activeProfile.autonomia > 0 ? activeProfile.precoEnergia / activeProfile.autonomia : 0;
    const custoEstimado = custoPorKm * kmRodado;
    const custoReal = gastoAbastecimento > 0 ? gastoAbastecimento : custoEstimado;
    recordDayWithTransactions({
      id: `${selectedDate}-${now}`,
      date: selectedDate,
      kmRodado,
      ganho,
      custo: custoReal,
      createdAt: now,
      updatedAt: now,
    });
    setModalVisible(false);
    setKmRodado(0);
    setGanho(0);
    setGastoAbastecimento(0);
  };

  const handleDelete = (date: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeDailyRecord(date);
    setDetailDate(null);
  };

  const detailRecord = detailDate ? recordMap.get(detailDate) : null;
  const todayDateStr = todayStr();

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Lançamentos</Text>

        {/* Navegação de mês */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={prevMonth} activeOpacity={0.7}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={nextMonth} activeOpacity={0.7}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Cabeçalho dos dias da semana */}
        <View style={styles.calendarCard}>
          <View style={styles.weekHeader}>
            {WEEK_DAYS.map((d) => (
              <Text key={d} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          {/* Grade do calendário */}
          <View style={styles.grid}>
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={styles.cell} />;
              }
              const ds = dateStr(viewYear, viewMonth, day);
              const hasRecord = recordMap.has(ds);
              const isToday = ds === todayDateStr;
              return (
                <TouchableOpacity
                  key={ds}
                  style={[
                    styles.cell,
                    hasRecord && styles.cellWithRecord,
                    isToday && !hasRecord && styles.cellToday,
                  ]}
                  onPress={() => hasRecord ? setDetailDate(ds) : openModal(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.cellText,
                    hasRecord && styles.cellTextRecord,
                    isToday && !hasRecord && styles.cellTextToday,
                  ]}>
                    {day}
                  </Text>
                  {hasRecord && (
                    <Text style={styles.cellDot}>
                      {fmt(recordMap.get(ds)!.ganho - recordMap.get(ds)!.custo).replace("R$ ", "")}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Legenda */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#00D4AA" }]} />
            <Text style={styles.legendText}>Dia com lançamento</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#0A84FF" }]} />
            <Text style={styles.legendText}>Hoje</Text>
          </View>
        </View>

        {/* Resumo do mês */}
        {dailyRecords.filter(r => r.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)).length > 0 && (
          <View style={styles.monthSummary}>
            {(() => {
              const monthRecs = dailyRecords.filter(r =>
                r.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)
              );
              const totalGanho = monthRecs.reduce((s, r) => s + r.ganho, 0);
              const totalCusto = monthRecs.reduce((s, r) => s + r.custo, 0);
              const totalFixos = fixedCostResult.custoFixoDiario * monthRecs.length;
              const lucroLiquido = totalGanho - totalCusto - totalFixos;
              return (
                <>
                  <Text style={styles.summaryTitle}>Resumo de {MONTHS[viewMonth]}</Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Dias Trabalhados</Text>
                      <Text style={styles.summaryValue}>{monthRecs.length}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Total Ganho</Text>
                      <Text style={[styles.summaryValue, { color: "#30D158" }]}>{fmt(totalGanho)}</Text>
                    </View>
                  </View>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Custo Combustível</Text>
                      <Text style={[styles.summaryValue, { color: "#FF453A" }]}>{fmt(totalCusto)}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Lucro Líquido</Text>
                      <Text style={[styles.summaryValue, { color: lucroLiquido >= 0 ? "#30D158" : "#FF453A" }]}>
                        {fmt(lucroLiquido)}
                      </Text>
                    </View>
                  </View>
                </>
              );
            })()}
          </View>
        )}
      </ScrollView>

      {/* Botão + flutuante */}
      <TouchableOpacity style={styles.fab} onPress={() => openModal()} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal de lançamento */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Lançar Dia</Text>

            {/* Data */}
            <Text style={styles.modalDateLabel}>Data</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                style={styles.dateInput}
                value={selectedDate}
                onChangeText={(t: string) => setSelectedDate(t.replace(/[^0-9-]/g, "").slice(0, 10))}
                placeholder="AAAA-MM-DD"
                placeholderTextColor="#555"
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                maxLength={10}
              />
            </View>

            <InputField label="KM Rodados" value={kmRodado} onChangeValue={setKmRodado} placeholder="0" suffix="km" />
            <InputField label="Ganho do Dia" value={ganho} onChangeValue={setGanho} placeholder="0,00" suffix="R$" />
            <InputField
              label={state.activeVehicleType === "COMBUSTAO" ? "Valor Abastecido (opcional)" : "Valor Recarregado (opcional)"}
              value={gastoAbastecimento}
              onChangeValue={setGastoAbastecimento}
              placeholder="0,00"
              suffix="R$"
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de detalhe do dia */}
      <Modal visible={!!detailDate} transparent animationType="fade" onRequestClose={() => setDetailDate(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.modalHandle} />
            {detailRecord && (
              <>
                <Text style={styles.modalTitle}>📅 {detailRecord.date}</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>KM Rodados</Text>
                  <Text style={styles.detailValue}>{detailRecord.kmRodado.toFixed(0)} km</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ganho</Text>
                  <Text style={[styles.detailValue, { color: "#30D158" }]}>{fmt(detailRecord.ganho)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Custo Combustível</Text>
                  <Text style={[styles.detailValue, { color: "#FF453A" }]}>{fmt(detailRecord.custo)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Custo Fixo do Dia</Text>
                  <Text style={[styles.detailValue, { color: "#FF9500" }]}>{fmt(fixedCostResult.custoFixoDiario)}</Text>
                </View>
                <View style={[styles.detailRow, styles.detailRowTotal]}>
                  <Text style={styles.detailLabelBold}>Lucro Líquido</Text>
                  <Text style={[styles.detailValueBold, {
                    color: (detailRecord.ganho - detailRecord.custo - fixedCostResult.custoFixoDiario) >= 0 ? "#30D158" : "#FF453A"
                  }]}>
                    {fmt(detailRecord.ganho - detailRecord.custo - fixedCostResult.custoFixoDiario)}
                  </Text>
                </View>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(detailRecord.date)} activeOpacity={0.8}>
                    <Text style={styles.deleteBtnText}>Excluir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editBtn} onPress={() => {
                    setDetailDate(null);
                    setSelectedDate(detailRecord.date);
                    setKmRodado(detailRecord.kmRodado);
                    setGanho(detailRecord.ganho);
                    setGastoAbastecimento(detailRecord.custo);
                    setModalVisible(true);
                  }} activeOpacity={0.8}>
                    <Text style={styles.editBtnText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={() => setDetailDate(null)} activeOpacity={0.8}>
                    <Text style={styles.saveBtnText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "700", letterSpacing: -0.5, marginBottom: 20 },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#111111", borderRadius: 14, padding: 4,
    marginBottom: 16, borderWidth: 1, borderColor: "#1C1C1E",
  },
  navBtn: { padding: 12, minWidth: 44, alignItems: "center" },
  navArrow: { color: "#00D4AA", fontSize: 28, fontWeight: "300", lineHeight: 32 },
  monthLabel: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  calendarCard: {
    backgroundColor: "#111111", borderRadius: 16,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: "#1C1C1E",
  },
  weekHeader: { flexDirection: "row", marginBottom: 8 },
  weekDay: {
    flex: 1, textAlign: "center", color: "#8E8E93",
    fontSize: 11, fontWeight: "600", textTransform: "uppercase",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`, aspectRatio: 0.85,
    alignItems: "center", justifyContent: "center",
    borderRadius: 8, padding: 2,
  },
  cellWithRecord: { backgroundColor: "#00D4AA", borderRadius: 10 },
  cellToday: { backgroundColor: "#0A84FF22", borderRadius: 10, borderWidth: 1, borderColor: "#0A84FF" },
  cellText: { color: "#FFFFFF", fontSize: 15, fontWeight: "500" },
  cellTextRecord: { color: "#000000", fontWeight: "700", fontSize: 14 },
  cellTextToday: { color: "#0A84FF", fontWeight: "700" },
  cellDot: { color: "#000000", fontSize: 9, fontWeight: "600", marginTop: 1 },
  legend: { flexDirection: "row", gap: 16, marginBottom: 20 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: "#8E8E93", fontSize: 12 },
  monthSummary: {
    backgroundColor: "#111111", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#1C1C1E", marginBottom: 20,
  },
  summaryTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", marginBottom: 12 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  summaryCard: {
    flex: 1, backgroundColor: "#000000", borderRadius: 12,
    padding: 10, borderWidth: 1, borderColor: "#1C1C1E",
  },
  summaryLabel: { color: "#8E8E93", fontSize: 11, fontWeight: "500", marginBottom: 4 },
  summaryValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#00D4AA", alignItems: "center", justifyContent: "center",
    shadowColor: "#00D4AA", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabText: { color: "#000000", fontSize: 30, fontWeight: "300", lineHeight: 34, marginTop: -2 },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#111111", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  detailSheet: {
    backgroundColor: "#111111", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: "#333333",
    borderRadius: 2, alignSelf: "center", marginBottom: 20,
  },
  modalTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginBottom: 16 },
  modalDateLabel: { color: "#8E8E93", fontSize: 13, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  dateInputRow: {
    backgroundColor: "#000000", borderRadius: 12, borderWidth: 1,
    borderColor: "#2C2C2E", paddingHorizontal: 16, height: 50,
    justifyContent: "center", marginBottom: 12,
  },
  dateInput: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, backgroundColor: "#1C1C1E", borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  cancelBtnText: { color: "#8E8E93", fontSize: 15, fontWeight: "600" },
  saveBtn: {
    flex: 2, backgroundColor: "#00D4AA", borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  saveBtnText: { color: "#000000", fontSize: 15, fontWeight: "700" },
  deleteBtn: {
    flex: 1, backgroundColor: "#FF453A22", borderRadius: 12,
    paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#FF453A44",
  },
  deleteBtnText: { color: "#FF453A", fontSize: 15, fontWeight: "600" },
  editBtn: {
    flex: 1, backgroundColor: "#0A84FF22", borderRadius: 12,
    paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#0A84FF44",
  },
  editBtnText: { color: "#0A84FF", fontSize: 15, fontWeight: "600" },
  detailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1C1C1E",
  },
  detailRowTotal: { borderBottomWidth: 0, marginTop: 4 },
  detailLabel: { color: "#8E8E93", fontSize: 14 },
  detailValue: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  detailLabelBold: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  detailValueBold: { fontSize: 20, fontWeight: "700" },
});
