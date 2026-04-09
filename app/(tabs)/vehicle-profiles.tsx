import {
  ScrollView, Text, View, StyleSheet, TouchableOpacity, Platform, TextInput,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { InputField } from "@/components/ui/input-field";
import { ResultCard } from "@/components/ui/result-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useApp } from "@/lib/app-context";
import type { VehicleType, VehicleProfile, OperationalInput } from "@/lib/types";
import { calculateOperationalCost } from "@/lib/use-cases";
import * as Haptics from "expo-haptics";
import { useState, useEffect } from "react";

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}
function fmtKm(val: number): string {
  return `R$ ${val.toFixed(3).replace(".", ",")}/km`;
}

export default function VehicleProfilesScreen() {
  const { state, setActiveVehicleType, saveVehicleProfileAction, setOperational, recordDayWithTransactions } = useApp();
  const { vehicleProfiles, activeVehicleType, operationalInput } = state;

  const typeOptions: VehicleType[] = ["COMBUSTAO", "ELETRICO"];
  const typeIndex = typeOptions.indexOf(activeVehicleType);

  const activeProfile = vehicleProfiles.find((p) => p.type === activeVehicleType) ?? {
    id: activeVehicleType.toLowerCase(),
    type: activeVehicleType,
    precoEnergia: 0,
    autonomia: 0,
    margemDesejada: 0,
  };

  // Campos do perfil
  const [precoEnergia, setPrecoEnergia] = useState(activeProfile.precoEnergia);
  const [autonomia, setAutonomia] = useState(activeProfile.autonomia);
  const [margemDesejada, setMargemDesejada] = useState(activeProfile.margemDesejada);

  // Campos do dia
  const [kmRodado, setKmRodado] = useState(operationalInput.kmRodadoDia);
  const [ganhoDia, setGanhoDia] = useState(operationalInput.ganhoDia);
  const [gastoAbastecimento, setGastoAbastecimento] = useState(operationalInput.gastoAbastecimento);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Sincroniza quando muda de tipo
  useEffect(() => {
    const p = vehicleProfiles.find((vp) => vp.type === activeVehicleType);
    setPrecoEnergia(p?.precoEnergia ?? 0);
    setAutonomia(p?.autonomia ?? 0);
    setMargemDesejada(p?.margemDesejada ?? 0);
  }, [activeVehicleType, vehicleProfiles]);

  const isCombustao = activeVehicleType === "COMBUSTAO";

  // Cálculos em tempo real
  const custoPorKm = autonomia > 0 ? precoEnergia / autonomia : 0;
  const custoTotalDiaEstimado = custoPorKm * kmRodado;
  const custoTotalDiaReal = gastoAbastecimento > 0 ? gastoAbastecimento : custoTotalDiaEstimado;
  const lucroDia = ganhoDia - custoTotalDiaReal;
  const lucroPorKm = kmRodado > 0 ? lucroDia / kmRodado : 0;
  const valorMinimoKm = custoPorKm + margemDesejada;
  const usingRealCost = gastoAbastecimento > 0;

  const handleSwitchType = (i: number) => {
    const newType = typeOptions[i];
    setActiveVehicleType(newType);
  };

  const handleSaveProfile = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const updated: VehicleProfile = {
      id: activeVehicleType.toLowerCase(),
      type: activeVehicleType,
      precoEnergia,
      autonomia,
      margemDesejada,
    };
    saveVehicleProfileAction(updated);
    // Sincroniza também o operationalInput com os dados do perfil
    setOperational({
      ...operationalInput,
      tipoVeiculo: activeVehicleType,
      precoCombustivel: precoEnergia,
      autonomia,
      margemDesejadaPorKm: margemDesejada,
    });
  };

  const handleSaveDay = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const now = Date.now();
    // Atualiza contexto operacional
    const updatedInput: OperationalInput = {
      tipoVeiculo: activeVehicleType,
      precoCombustivel: precoEnergia,
      autonomia,
      kmRodadoDia: kmRodado,
      ganhoDia,
      margemDesejadaPorKm: margemDesejada,
      gastoAbastecimento,
    };
    setOperational(updatedInput);
    // Salva registro com transações automáticas
    recordDayWithTransactions({
      id: `${selectedDate}-${now}`,
      date: selectedDate,
      kmRodado,
      ganho: ganhoDia,
      custo: custoTotalDiaReal,
      createdAt: now,
      updatedAt: now,
    });
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Perfis de Veículo</Text>
        <Text style={styles.subtitle}>
          Configure seu veículo, veja os cálculos em tempo real e registre o dia de trabalho.
        </Text>

        {/* Toggle de tipo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tipo de Veículo</Text>
          <SegmentedControl
            options={["Combustão", "Elétrico"]}
            selectedIndex={typeIndex}
            onSelect={handleSwitchType}
          />
        </View>

        {/* Badge do perfil ativo */}
        <View style={[styles.activeBadge, isCombustao ? styles.badgeCombustao : styles.badgeEletrico]}>
          <Text style={[styles.activeBadgeText, isCombustao ? styles.badgeTextCombustao : styles.badgeTextEletrico]}>
            {isCombustao ? "⛽ Perfil Combustão — Ativo" : "🔋 Perfil Elétrico — Ativo"}
          </Text>
        </View>

        {/* Configuração do perfil */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Configuração do Veículo</Text>
          <InputField
            label={isCombustao ? "Preço do Combustível (por litro)" : "Preço da Energia (por kWh)"}
            value={precoEnergia}
            onChangeValue={setPrecoEnergia}
            placeholder="0,00"
            suffix="R$"
          />
          <InputField
            label={isCombustao ? "Autonomia (km/L)" : "Autonomia (km/kWh)"}
            value={autonomia}
            onChangeValue={setAutonomia}
            placeholder="0"
            suffix={isCombustao ? "km/L" : "km/kWh"}
          />
          <InputField
            label="Margem de Lucro Desejada por KM"
            value={margemDesejada}
            onChangeValue={setMargemDesejada}
            placeholder="0,00"
            suffix="R$/km"
          />
          <TouchableOpacity style={styles.saveProfileBtn} onPress={handleSaveProfile} activeOpacity={0.8}>
            <Text style={styles.saveProfileBtnText}>Salvar Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* Cálculos do perfil */}
        {(precoEnergia > 0 || autonomia > 0) && (
          <View style={styles.section}>
            <Text style={styles.resultsTitle}>Cálculos do Perfil</Text>
            <ResultCard
              icon="speed"
              title="Custo por KM"
              value={fmtKm(custoPorKm)}
              subtitle={autonomia > 0 ? `${fmt(precoEnergia)} ÷ ${autonomia} ${isCombustao ? "km/L" : "km/kWh"}` : "Informe preço e autonomia"}
              accentColor="#FF9500"
            />
            <ResultCard
              icon="verified"
              title="Valor Mínimo por KM"
              value={fmtKm(valorMinimoKm)}
              subtitle={`Custo ${fmtKm(custoPorKm)} + Margem ${fmtKm(margemDesejada)}`}
              accentColor="#00D4AA"
            />
          </View>
        )}

        {/* Dados do dia */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dados do Dia</Text>
          <InputField
            label="KM Rodados Hoje"
            value={kmRodado}
            onChangeValue={setKmRodado}
            placeholder="0"
            suffix="km"
          />
          <InputField
            label="Ganho do Dia"
            value={ganhoDia}
            onChangeValue={setGanhoDia}
            placeholder="0,00"
            suffix="R$"
          />

          {/* Abastecimento */}
          <InputField
            label={isCombustao ? "Valor Abastecido (opcional)" : "Valor Recarregado (opcional)"}
            value={gastoAbastecimento}
            onChangeValue={setGastoAbastecimento}
            placeholder="0,00"
            suffix="R$"
          />
          {usingRealCost ? (
            <View style={styles.fuelNoteReal}>
              <Text style={styles.fuelNoteRealText}>✓ Usando custo real: {fmt(gastoAbastecimento)}</Text>
            </View>
          ) : (
            <View style={styles.fuelNoteEstimated}>
              <Text style={styles.fuelNoteEstimatedText}>ℹ Usando custo estimado: {fmt(custoTotalDiaEstimado)}</Text>
            </View>
          )}

          {/* Data */}
          <Text style={styles.dateLabel}>Data do Registro</Text>
          <View style={styles.dateInputRow}>
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={(t: string) => {
                const cleaned = t.replace(/[^0-9-]/g, "").slice(0, 10);
                setSelectedDate(cleaned);
              }}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#444444"
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              maxLength={10}
            />
          </View>
          <Text style={styles.dateHint}>Você pode registrar qualquer data — hoje ou dias anteriores.</Text>
        </View>

        {/* Resultados do dia */}
        {(kmRodado > 0 || ganhoDia > 0) && (
          <View style={styles.section}>
            <Text style={styles.resultsTitle}>Resultados do Dia</Text>
            <ResultCard
              icon="local-gas-station"
              title={usingRealCost ? "Custo Real do Dia" : "Custo Estimado do Dia"}
              value={fmt(custoTotalDiaReal)}
              subtitle={usingRealCost ? `Gasto real informado` : `${fmtKm(custoPorKm)} × ${kmRodado} km`}
              accentColor={usingRealCost ? "#FF453A" : "#FF9500"}
            />
            <ResultCard
              icon="trending-up"
              title="Lucro por KM"
              value={fmtKm(lucroPorKm)}
              subtitle={`Calculado com custo ${usingRealCost ? "real" : "estimado"}`}
              accentColor={lucroPorKm >= 0 ? "#30D158" : "#FF453A"}
            />
            <ResultCard
              icon="account-balance-wallet"
              title="Lucro Líquido do Dia"
              value={fmt(lucroDia)}
              subtitle={`Ganho ${fmt(ganhoDia)} − Custo ${fmt(custoTotalDiaReal)}`}
              accentColor={lucroDia >= 0 ? "#30D158" : "#FF453A"}
            />
          </View>
        )}

        {/* Comparação entre perfis */}
        {vehicleProfiles.filter((p) => p.precoEnergia > 0 || p.autonomia > 0).length >= 2 && (
          <View style={styles.section}>
            <Text style={styles.resultsTitle}>Comparação de Perfis</Text>
            {vehicleProfiles.map((p) => (
              <View key={p.type} style={[styles.compCard, p.type === activeVehicleType && styles.compCardActive]}>
                <Text style={styles.compCardTitle}>
                  {p.type === "COMBUSTAO" ? "⛽ Combustão" : "🔋 Elétrico"}
                  {p.type === activeVehicleType ? " (ativo)" : ""}
                </Text>
                <Text style={styles.compCardText}>
                  Preço: {fmt(p.precoEnergia)} · Autonomia: {p.autonomia} {p.type === "COMBUSTAO" ? "km/L" : "km/kWh"}
                </Text>
                {p.precoEnergia > 0 && p.autonomia > 0 && (
                  <Text style={styles.compCardCost}>
                    Custo/km: {fmtKm(p.precoEnergia / p.autonomia)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.saveDayBtn} onPress={handleSaveDay} activeOpacity={0.8}>
          <Text style={styles.saveDayBtnText}>Salvar Dia nos Relatórios</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "700", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { color: "#8E8E93", fontSize: 15, lineHeight: 22, marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionLabel: {
    color: "#8E8E93", fontSize: 13, fontWeight: "500",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  activeBadge: {
    borderRadius: 10, padding: 12, marginBottom: 20,
    borderWidth: 1, alignItems: "center",
  },
  badgeCombustao: { backgroundColor: "rgba(255,149,0,0.1)", borderColor: "rgba(255,149,0,0.3)" },
  badgeEletrico: { backgroundColor: "rgba(0,212,170,0.1)", borderColor: "rgba(0,212,170,0.3)" },
  activeBadgeText: { fontSize: 14, fontWeight: "600" },
  badgeTextCombustao: { color: "#FF9500" },
  badgeTextEletrico: { color: "#00D4AA" },
  card: {
    backgroundColor: "#111111", borderRadius: 16, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: "#1C1C1E",
  },
  cardTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", marginBottom: 16 },
  saveProfileBtn: {
    backgroundColor: "#0A84FF", borderRadius: 12,
    paddingVertical: 12, alignItems: "center", marginTop: 4,
  },
  saveProfileBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  resultsTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  fuelNoteReal: {
    backgroundColor: "rgba(0,212,170,0.1)", borderRadius: 8,
    padding: 10, marginTop: -8, marginBottom: 12,
  },
  fuelNoteRealText: { color: "#00D4AA", fontSize: 13, fontWeight: "500" },
  fuelNoteEstimated: {
    backgroundColor: "rgba(255,149,0,0.1)", borderRadius: 8,
    padding: 10, marginTop: -8, marginBottom: 12,
  },
  fuelNoteEstimatedText: { color: "#FF9500", fontSize: 13, fontWeight: "500" },
  dateLabel: {
    color: "#8E8E93", fontSize: 13, fontWeight: "500",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
  },
  dateInputRow: {
    backgroundColor: "#000000", borderRadius: 12, borderWidth: 1,
    borderColor: "#2C2C2E", paddingHorizontal: 16, height: 50,
    justifyContent: "center", marginBottom: 6,
  },
  dateInput: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  dateHint: { color: "#8E8E93", fontSize: 12, lineHeight: 18, marginBottom: 4 },
  compCard: {
    backgroundColor: "#111111", borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#1C1C1E",
  },
  compCardActive: { borderColor: "#0A84FF" },
  compCardTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginBottom: 4 },
  compCardText: { color: "#8E8E93", fontSize: 13, lineHeight: 18 },
  compCardCost: { color: "#FF9500", fontSize: 13, fontWeight: "600", marginTop: 4 },
  saveDayBtn: {
    backgroundColor: "#00D4AA", borderRadius: 14,
    paddingVertical: 16, alignItems: "center", marginBottom: 20,
  },
  saveDayBtnText: { color: "#000000", fontSize: 17, fontWeight: "700" },
});
