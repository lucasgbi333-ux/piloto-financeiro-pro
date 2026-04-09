import {
  Text, View, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, TextInput, Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { InputField } from "@/components/ui/input-field";
import { ResultCard } from "@/components/ui/result-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import * as Haptics from "expo-haptics";
import { useState, useMemo } from "react";
import type { DailyRecord, VehicleType } from "@/lib/types";
import { calculateOperationalCost } from "@/lib/use-cases";

const WEEK_DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}
function fmtKm(val: number): string {
  return `R$ ${val.toFixed(3).replace(".", ",")}/km`;
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
  const { dailyRecords, vehicleProfiles, operationalProfiles, fixedCostResult } = state;

  // Perfis por tipo — carregados independentemente
  const profileCombustao = vehicleProfiles.find((p) => p.type === "COMBUSTAO") ?? { precoEnergia: 0, autonomia: 0, margemDesejada: 0, type: "COMBUSTAO" as VehicleType, name: "" };
  const profileEletrico = vehicleProfiles.find((p) => p.type === "ELETRICO") ?? { precoEnergia: 0, autonomia: 0, margemDesejada: 0, type: "ELETRICO" as VehicleType, name: "" };

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Modal de lançamento
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());

  // Tipo de veículo selecionado no modal — independente do perfil ativo global
  const [tipoVeiculo, setTipoVeiculo] = useState<VehicleType>("COMBUSTAO");

  // Campos de energia — carregados do perfil do tipo selecionado
  const [precoCombustivel, setPrecoCombustivel] = useState(0);
  const [autonomia, setAutonomia] = useState(0);

  // Dados do dia
  const [kmRodado, setKmRodado] = useState(0);
  const [ganho, setGanho] = useState(0);
  const [margemDesejada, setMargemDesejada] = useState(0);
  const [gastoAbastecimento, setGastoAbastecimento] = useState(0);

  // Modal de detalhe do dia
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detailVehicleType, setDetailVehicleType] = useState<VehicleType | null>(null);

  // Perfil ativo para o tipo selecionado no modal
  const activeProfileForType = tipoVeiculo === "COMBUSTAO" ? profileCombustao : profileEletrico;

  // Mapa de registros por data — pode ter 2 por data (um de cada perfil)
  const recordsByDate = useMemo(() => {
    const map = new Map<string, DailyRecord[]>();
    for (const r of dailyRecords) {
      const existing = map.get(r.date) ?? [];
      map.set(r.date, [...existing, r]);
    }
    return map;
  }, [dailyRecords]);

  // Gera os dias do calendário para o mês atual
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
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

  // Carrega os dados do perfil do tipo selecionado nos campos do modal
  const loadProfileDefaults = (type: VehicleType) => {
    const profile = type === "COMBUSTAO" ? profileCombustao : profileEletrico;
    const opProfile = operationalProfiles[type];
    setPrecoCombustivel(opProfile.precoCombustivel > 0 ? opProfile.precoCombustivel : profile.precoEnergia);
    setAutonomia(opProfile.autonomia > 0 ? opProfile.autonomia : profile.autonomia);
    setMargemDesejada(opProfile.margemDesejadaPorKm > 0 ? opProfile.margemDesejadaPorKm : profile.margemDesejada);
  };

  const openModal = (day?: number) => {
    const ds = day ? dateStr(viewYear, viewMonth, day) : todayStr();
    setSelectedDate(ds);
    // Reseta campos do dia
    setKmRodado(0);
    setGanho(0);
    setGastoAbastecimento(0);
    // Carrega tipo padrão (Combustão) e seus dados de perfil
    const defaultType: VehicleType = "COMBUSTAO";
    setTipoVeiculo(defaultType);
    loadProfileDefaults(defaultType);
    setModalVisible(true);
  };

  const handleSwitchVehicle = (i: number) => {
    const newType: VehicleType = i === 0 ? "COMBUSTAO" : "ELETRICO";
    setTipoVeiculo(newType);
    // Ao trocar o tipo, carrega os dados do perfil daquele tipo
    loadProfileDefaults(newType);
    // Reseta campos do dia (cada perfil tem seu próprio dia)
    setKmRodado(0);
    setGanho(0);
    setGastoAbastecimento(0);
  };

  // Cálculo em tempo real no modal — idêntico ao Operacional
  const modalResult = useMemo(() => {
    return calculateOperationalCost(
      {
        tipoVeiculo,
        precoCombustivel,
        autonomia,
        kmRodadoDia: kmRodado,
        ganhoDia: ganho,
        margemDesejadaPorKm: margemDesejada,
        gastoAbastecimento,
      },
      undefined,
      fixedCostResult.custoFixoDiario
    );
  }, [tipoVeiculo, precoCombustivel, autonomia, kmRodado, ganho, margemDesejada, gastoAbastecimento, fixedCostResult.custoFixoDiario]);

  const usingRealCost = modalResult.isUsingRealCost;

  const handleSave = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = Date.now();
    const custoReal = gastoAbastecimento > 0 ? gastoAbastecimento : modalResult.custoTotalDiaEstimado;
    recordDayWithTransactions({
      id: `${selectedDate}-${tipoVeiculo}-${now}`,
      date: selectedDate,
      kmRodado,
      ganho,
      custo: custoReal,
      vehicleType: tipoVeiculo,
      createdAt: now,
      updatedAt: now,
    });
    setModalVisible(false);
    setKmRodado(0);
    setGanho(0);
    setGastoAbastecimento(0);
  };

  const handleClear = () => {
    Alert.alert(
      "Limpar Campos",
      "Isso vai zerar todos os campos do lançamento. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setKmRodado(0);
            setGanho(0);
            setGastoAbastecimento(0);
            setMargemDesejada(activeProfileForType.margemDesejada);
            setPrecoCombustivel(activeProfileForType.precoEnergia);
            setAutonomia(activeProfileForType.autonomia);
          },
        },
      ]
    );
  };

  const handleDelete = (date: string, vType: VehicleType) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeDailyRecord(date, vType);
    setDetailDate(null);
    setDetailVehicleType(null);
  };

  const todayDateStr = todayStr();

  // Registro do detalhe selecionado
  const detailRecord = detailDate && detailVehicleType
    ? (recordsByDate.get(detailDate) ?? []).find((r) => r.vehicleType === detailVehicleType) ?? null
    : null;

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
              const recs = recordsByDate.get(ds) ?? [];
              const hasCombustao = recs.some((r) => r.vehicleType === "COMBUSTAO");
              const hasEletrico = recs.some((r) => r.vehicleType === "ELETRICO");
              const hasBoth = hasCombustao && hasEletrico;
              const hasAny = recs.length > 0;
              const isToday = ds === todayDateStr;

              return (
                <TouchableOpacity
                  key={ds}
                  style={[
                    styles.cell,
                    hasBoth && styles.cellBoth,
                    !hasBoth && hasCombustao && styles.cellCombustao,
                    !hasBoth && hasEletrico && styles.cellEletrico,
                    isToday && !hasAny && styles.cellToday,
                  ]}
                  onPress={() => {
                    if (hasBoth) {
                      // Tem ambos: abre modal de seleção de qual ver
                      setDetailDate(ds);
                      setDetailVehicleType("COMBUSTAO"); // padrão, usuário pode trocar
                    } else if (hasAny) {
                      setDetailDate(ds);
                      setDetailVehicleType(recs[0].vehicleType);
                    } else {
                      openModal(day);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.cellText,
                    hasAny && styles.cellTextRecord,
                    isToday && !hasAny && styles.cellTextToday,
                  ]}>
                    {day}
                  </Text>
                  {/* Indicadores de perfil */}
                  {hasAny && (
                    <View style={styles.cellIndicators}>
                      {hasCombustao && <View style={[styles.cellDot, { backgroundColor: "#FF9500" }]} />}
                      {hasEletrico && <View style={[styles.cellDot, { backgroundColor: "#30D158" }]} />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Legenda */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FF9500" }]} />
            <Text style={styles.legendText}>⛽ Combustão</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#30D158" }]} />
            <Text style={styles.legendText}>🔋 Elétrico</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#0A84FF" }]} />
            <Text style={styles.legendText}>Hoje</Text>
          </View>
        </View>

        {/* Resumo do mês separado por perfil */}
        {(() => {
          const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
          const monthRecs = dailyRecords.filter(r => r.date.startsWith(monthPrefix));
          const combustaoRecs = monthRecs.filter(r => r.vehicleType === "COMBUSTAO");
          const eletricoRecs = monthRecs.filter(r => r.vehicleType === "ELETRICO");
          if (monthRecs.length === 0) return null;

          const calcTotals = (recs: DailyRecord[]) => ({
            ganho: recs.reduce((s, r) => s + r.ganho, 0),
            custo: recs.reduce((s, r) => s + r.custo, 0),
            fixos: fixedCostResult.custoFixoDiario * recs.length,
            dias: recs.length,
          });

          const c = calcTotals(combustaoRecs);
          const e = calcTotals(eletricoRecs);
          const cLiq = c.ganho - c.custo - c.fixos;
          const eLiq = e.ganho - e.custo - e.fixos;

          return (
            <View style={styles.monthSummary}>
              <Text style={styles.summaryTitle}>Resumo de {MONTHS[viewMonth]}</Text>

              {combustaoRecs.length > 0 && (
                <View style={[styles.profileSummaryCard, { borderColor: "#FF950044" }]}>
                  <Text style={[styles.profileSummaryTitle, { color: "#FF9500" }]}>⛽ Combustão · {c.dias} dias</Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Ganho</Text>
                      <Text style={[styles.summaryValue, { color: "#30D158" }]}>{fmt(c.ganho)}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Combustível</Text>
                      <Text style={[styles.summaryValue, { color: "#FF453A" }]}>{fmt(c.custo)}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Lucro Líq.</Text>
                      <Text style={[styles.summaryValue, { color: cLiq >= 0 ? "#30D158" : "#FF453A" }]}>{fmt(cLiq)}</Text>
                    </View>
                  </View>
                </View>
              )}

              {eletricoRecs.length > 0 && (
                <View style={[styles.profileSummaryCard, { borderColor: "#30D15844" }]}>
                  <Text style={[styles.profileSummaryTitle, { color: "#30D158" }]}>🔋 Elétrico · {e.dias} dias</Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Ganho</Text>
                      <Text style={[styles.summaryValue, { color: "#30D158" }]}>{fmt(e.ganho)}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Recarga</Text>
                      <Text style={[styles.summaryValue, { color: "#FF453A" }]}>{fmt(e.custo)}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Lucro Líq.</Text>
                      <Text style={[styles.summaryValue, { color: eLiq >= 0 ? "#30D158" : "#FF453A" }]}>{fmt(eLiq)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })()}
      </ScrollView>

      {/* Botão + flutuante */}
      <TouchableOpacity style={styles.fab} onPress={() => openModal()} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ===== MODAL DE LANÇAMENTO ===== */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Lançar Dia</Text>
              <Text style={styles.modalSubtitle}>
                Calcule o custo por KM e o lucro real. Os dados do perfil ativo são carregados automaticamente.
              </Text>

              {/* Data */}
              <Text style={styles.sectionLabel}>Data</Text>
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

              {/* Tipo de veículo — seletor independente */}
              <Text style={styles.sectionLabel}>Tipo de Veículo</Text>
              <SegmentedControl
                options={["⛽ Combustão", "🔋 Elétrico"]}
                selectedIndex={tipoVeiculo === "COMBUSTAO" ? 0 : 1}
                onSelect={handleSwitchVehicle}
              />
              <View style={styles.sectionSpacer} />

              {/* Badge do perfil individual do tipo selecionado */}
              {(activeProfileForType.precoEnergia > 0 || activeProfileForType.autonomia > 0) && (
                <View style={[styles.profileBadge, {
                  backgroundColor: tipoVeiculo === "COMBUSTAO" ? "rgba(255,149,0,0.1)" : "rgba(48,209,88,0.1)",
                  borderColor: tipoVeiculo === "COMBUSTAO" ? "rgba(255,149,0,0.3)" : "rgba(48,209,88,0.3)",
                }]}>
                  <Text style={[styles.profileBadgeText, { color: tipoVeiculo === "COMBUSTAO" ? "#FF9500" : "#30D158" }]}>
                    {tipoVeiculo === "COMBUSTAO" ? "⛽" : "🔋"} Perfil {tipoVeiculo === "COMBUSTAO" ? "Combustão" : "Elétrico"}: R$ {activeProfileForType.precoEnergia.toFixed(2).replace(".", ",")} · {activeProfileForType.autonomia} {tipoVeiculo === "COMBUSTAO" ? "km/L" : "km/kWh"}
                  </Text>
                </View>
              )}

              {/* Configuração de Energia */}
              <Text style={styles.sectionLabel}>Configuração de Energia</Text>
              <InputField
                label={tipoVeiculo === "COMBUSTAO" ? "Preço do Combustível (L)" : "Preço kWh"}
                value={precoCombustivel}
                onChangeValue={setPrecoCombustivel}
                placeholder={activeProfileForType.precoEnergia > 0 ? activeProfileForType.precoEnergia.toFixed(2) : "0,00"}
                suffix="R$"
              />
              <InputField
                label={tipoVeiculo === "COMBUSTAO" ? "Autonomia (km/L)" : "Autonomia (km/kWh)"}
                value={autonomia}
                onChangeValue={setAutonomia}
                placeholder={activeProfileForType.autonomia > 0 ? String(activeProfileForType.autonomia) : "0"}
                suffix={tipoVeiculo === "COMBUSTAO" ? "km/L" : "km/kWh"}
              />

              {/* Dados do Dia */}
              <Text style={styles.sectionLabel}>Dados do Dia</Text>
              <InputField
                label="KM Rodados"
                value={kmRodado}
                onChangeValue={setKmRodado}
                placeholder="0"
                suffix="km"
              />
              <InputField
                label="Ganho do Dia"
                value={ganho}
                onChangeValue={setGanho}
                placeholder="0,00"
                suffix="R$"
              />
              <InputField
                label="Margem Desejada por KM"
                value={margemDesejada}
                onChangeValue={setMargemDesejada}
                placeholder={activeProfileForType.margemDesejada > 0 ? activeProfileForType.margemDesejada.toFixed(2) : "0,00"}
                suffix="R$/km"
              />

              {/* Abastecimento / Recarga */}
              <View style={styles.fuelSection}>
                <Text style={styles.fuelTitle}>
                  {tipoVeiculo === "COMBUSTAO" ? "⛽ Abastecimento de Hoje" : "🔋 Recarga de Hoje"}
                </Text>
                <Text style={styles.fuelSubtitle}>
                  {tipoVeiculo === "COMBUSTAO"
                    ? "Quanto você gastou no posto hoje? (opcional)"
                    : "Quanto você gastou na recarga elétrica hoje? (opcional)"}
                </Text>
                <InputField
                  label={tipoVeiculo === "COMBUSTAO" ? "Valor Abastecido" : "Valor Recarregado"}
                  value={gastoAbastecimento}
                  onChangeValue={setGastoAbastecimento}
                  placeholder="0,00 (opcional)"
                  suffix="R$"
                />
                {usingRealCost ? (
                  <View style={styles.fuelNoteReal}>
                    <Text style={styles.fuelNoteRealText}>
                      ✓ Usando custo real baseado no seu {tipoVeiculo === "COMBUSTAO" ? "abastecimento" : "recarga elétrica"}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.fuelNoteEstimated}>
                    <Text style={styles.fuelNoteEstimatedText}>
                      ℹ Usando estimativa — adicione {tipoVeiculo === "COMBUSTAO" ? "abastecimento" : "recarga"} para maior precisão
                    </Text>
                  </View>
                )}
              </View>

              {/* ===== RESULTADOS ===== */}
              <Text style={styles.resultsTitle}>Resultados</Text>

              <ResultCard
                icon="speed"
                title={usingRealCost ? "Custo por KM (Real)" : "Custo por KM (Estimado)"}
                value={fmtKm(modalResult.custoPorKm)}
                subtitle={
                  usingRealCost
                    ? `Baseado no gasto real: ${fmt(gastoAbastecimento)}`
                    : `Adicione ${tipoVeiculo === "COMBUSTAO" ? "abastecimento" : "recarga"} para custo real`
                }
                accentColor={usingRealCost ? "#00D4AA" : "#FF9500"}
              />

              <ResultCard
                icon="local-gas-station"
                title={usingRealCost ? "Custo Real do Dia" : "Custo Estimado do Dia"}
                value={fmt(modalResult.custoTotalDiaReal)}
                subtitle={usingRealCost ? `Gasto real: ${fmt(gastoAbastecimento)}` : `Estimado: ${fmt(modalResult.custoTotalDiaEstimado)}`}
                accentColor={usingRealCost ? "#FF453A" : "#FF9500"}
              />

              <ResultCard
                icon="trending-up"
                title="Lucro por KM"
                value={fmtKm(modalResult.lucroPorKm)}
                subtitle={`Calculado com custo ${usingRealCost ? "real" : "estimado"}`}
                accentColor={modalResult.lucroPorKm >= 0 ? "#30D158" : "#FF453A"}
              />

              <ResultCard
                icon="account-balance-wallet"
                title="Lucro Líquido do Dia"
                value={fmt(modalResult.lucroDiaLiquido)}
                subtitle={`Ganho ${fmt(ganho)} − Custo ${fmt(modalResult.custoTotalDiaReal)} − Fixos ${fmt(fixedCostResult.custoFixoDiario)}`}
                accentColor={modalResult.lucroDiaLiquido >= 0 ? "#30D158" : "#FF453A"}
              />

              <ResultCard
                icon="verified"
                title="Valor Mínimo por KM"
                value={fmtKm(modalResult.valorMinimoKm)}
                subtitle="Aceite corridas acima deste valor"
                accentColor="#00D4AA"
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
                  <Text style={styles.clearBtnText}>Limpar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                  <Text style={styles.saveBtnText}>Salvar Dia</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de detalhe do dia */}
      <Modal visible={!!detailDate} transparent animationType="fade" onRequestClose={() => { setDetailDate(null); setDetailVehicleType(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.modalHandle} />
            {detailDate && (
              <>
                <Text style={styles.modalTitle}>📅 {detailDate}</Text>

                {/* Se tem ambos os perfis, mostra seletor */}
                {(() => {
                  const recs = recordsByDate.get(detailDate) ?? [];
                  const hasBoth = recs.some(r => r.vehicleType === "COMBUSTAO") && recs.some(r => r.vehicleType === "ELETRICO");
                  if (hasBoth) {
                    return (
                      <View style={styles.detailProfileSelector}>
                        <TouchableOpacity
                          style={[styles.detailProfileBtn, detailVehicleType === "COMBUSTAO" && { borderColor: "#FF9500", backgroundColor: "#FF950022" }]}
                          onPress={() => setDetailVehicleType("COMBUSTAO")}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.detailProfileBtnText, detailVehicleType === "COMBUSTAO" && { color: "#FF9500" }]}>⛽ Combustão</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.detailProfileBtn, detailVehicleType === "ELETRICO" && { borderColor: "#30D158", backgroundColor: "#30D15822" }]}
                          onPress={() => setDetailVehicleType("ELETRICO")}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.detailProfileBtnText, detailVehicleType === "ELETRICO" && { color: "#30D158" }]}>🔋 Elétrico</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  return null;
                })()}

                {detailRecord && (
                  <>
                    <View style={[styles.detailTypeBadge, {
                      backgroundColor: detailRecord.vehicleType === "ELETRICO" ? "#30D15822" : "#FF950022",
                    }]}>
                      <Text style={[styles.detailTypeBadgeText, { color: detailRecord.vehicleType === "ELETRICO" ? "#30D158" : "#FF9500" }]}>
                        {detailRecord.vehicleType === "ELETRICO" ? "🔋 Elétrico" : "⛽ Combustão"}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>KM Rodados</Text>
                      <Text style={styles.detailValue}>{detailRecord.kmRodado.toFixed(0)} km</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ganho</Text>
                      <Text style={[styles.detailValue, { color: "#30D158" }]}>{fmt(detailRecord.ganho)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{detailRecord.vehicleType === "ELETRICO" ? "Custo Recarga" : "Custo Combustível"}</Text>
                      <Text style={[styles.detailValue, { color: "#FF453A" }]}>{fmt(detailRecord.custo)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Custo Fixo do Dia</Text>
                      <Text style={[styles.detailValue, { color: "#FF9500" }]}>{fmt(fixedCostResult.custoFixoDiario)}</Text>
                    </View>
                    <View style={[styles.detailRow, styles.detailRowTotal]}>
                      <Text style={styles.detailLabelBold}>Lucro Líquido</Text>
                      <Text style={[
                        styles.detailValueBold,
                        { color: (detailRecord.ganho - detailRecord.custo - fixedCostResult.custoFixoDiario) >= 0 ? "#30D158" : "#FF453A" }
                      ]}>
                        {fmt(detailRecord.ganho - detailRecord.custo - fixedCostResult.custoFixoDiario)}
                      </Text>
                    </View>
                    <View style={styles.modalBtns}>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(detailRecord.date, detailRecord.vehicleType)} activeOpacity={0.8}>
                        <Text style={styles.deleteBtnText}>Excluir</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.editBtn} onPress={() => {
                        setDetailDate(null);
                        setDetailVehicleType(null);
                        setTimeout(() => {
                          setSelectedDate(detailRecord.date);
                          setTipoVeiculo(detailRecord.vehicleType);
                          loadProfileDefaults(detailRecord.vehicleType);
                          setKmRodado(detailRecord.kmRodado);
                          setGanho(detailRecord.ganho);
                          setGastoAbastecimento(detailRecord.custo);
                          setModalVisible(true);
                        }, 50);
                      }} activeOpacity={0.8}>
                        <Text style={styles.editBtnText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveBtn} onPress={() => { setDetailDate(null); setDetailVehicleType(null); }} activeOpacity={0.8}>
                        <Text style={styles.saveBtnText}>Fechar</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
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
  cellCombustao: { backgroundColor: "#FF950033", borderRadius: 10, borderWidth: 1, borderColor: "#FF9500" },
  cellEletrico: { backgroundColor: "#30D15833", borderRadius: 10, borderWidth: 1, borderColor: "#30D158" },
  cellBoth: { backgroundColor: "#1C1C1E", borderRadius: 10, borderWidth: 1, borderColor: "#00D4AA" },
  cellToday: { backgroundColor: "#0A84FF22", borderRadius: 10, borderWidth: 1, borderColor: "#0A84FF" },
  cellText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
  cellTextRecord: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  cellTextToday: { color: "#0A84FF", fontWeight: "700" },
  cellIndicators: { flexDirection: "row", gap: 2, marginTop: 2 },
  cellDot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: "row", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: "#8E8E93", fontSize: 12 },
  monthSummary: {
    backgroundColor: "#111111", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#1C1C1E", marginBottom: 20, gap: 10,
  },
  summaryTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", marginBottom: 4 },
  profileSummaryCard: {
    backgroundColor: "#000000", borderRadius: 12, padding: 12,
    borderWidth: 1,
  },
  profileSummaryTitle: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: {
    flex: 1, backgroundColor: "#111111", borderRadius: 10,
    padding: 8, borderWidth: 1, borderColor: "#1C1C1E",
  },
  summaryLabel: { color: "#8E8E93", fontSize: 10, fontWeight: "500", marginBottom: 3 },
  summaryValue: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
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
  modalScroll: { maxHeight: "95%" },
  modalScrollContent: { justifyContent: "flex-end" },
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
  modalTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  modalSubtitle: { color: "#8E8E93", fontSize: 14, lineHeight: 20, marginBottom: 20 },
  sectionLabel: {
    color: "#8E8E93", fontSize: 12, fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 4,
  },
  sectionSpacer: { height: 12 },
  profileBadge: {
    borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1,
  },
  profileBadgeText: { fontSize: 13, fontWeight: "600" },
  dateInputRow: {
    backgroundColor: "#000000", borderRadius: 12, borderWidth: 1,
    borderColor: "#2C2C2E", paddingHorizontal: 16, height: 50,
    justifyContent: "center", marginBottom: 12,
  },
  dateInput: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  fuelSection: {
    backgroundColor: "#0A0A0A", borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: "#2C2C2E",
  },
  fuelTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", marginBottom: 4 },
  fuelSubtitle: { color: "#8E8E93", fontSize: 12, lineHeight: 16, marginBottom: 12 },
  fuelNoteReal: { backgroundColor: "rgba(0,212,170,0.1)", borderRadius: 8, padding: 8, marginTop: -4 },
  fuelNoteRealText: { color: "#00D4AA", fontSize: 12, fontWeight: "500" },
  fuelNoteEstimated: { backgroundColor: "rgba(255,149,0,0.1)", borderRadius: 8, padding: 8, marginTop: -4 },
  fuelNoteEstimatedText: { color: "#FF9500", fontSize: 12, fontWeight: "500" },
  resultsTitle: {
    color: "#FFFFFF", fontSize: 18, fontWeight: "700",
    marginTop: 8, marginBottom: 12,
  },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, backgroundColor: "#1C1C1E", borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  cancelBtnText: { color: "#8E8E93", fontSize: 15, fontWeight: "600" },
  clearBtn: {
    flex: 1, backgroundColor: "#1C1C1E", borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: "#FF453A",
  },
  clearBtnText: { color: "#FF453A", fontSize: 15, fontWeight: "600" },
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
  detailTypeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 12 },
  detailTypeBadgeText: { fontSize: 13, fontWeight: "700" },
  detailProfileSelector: { flexDirection: "row", gap: 8, marginBottom: 14 },
  detailProfileBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: "#2C2C2E", alignItems: "center",
    backgroundColor: "#000000",
  },
  detailProfileBtnText: { color: "#8E8E93", fontSize: 13, fontWeight: "600" },
});
