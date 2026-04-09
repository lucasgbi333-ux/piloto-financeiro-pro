import {
  ScrollView, Text, View, StyleSheet, TouchableOpacity, Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { InputField } from "@/components/ui/input-field";
import { ResultCard } from "@/components/ui/result-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useApp } from "@/lib/app-context";
import type { VehicleType, VehicleProfile } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { useState, useEffect } from "react";

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}
function fmtKm(val: number): string {
  return `R$ ${val.toFixed(3).replace(".", ",")}/km`;
}

export default function VehicleProfilesScreen() {
  const { state, setActiveVehicleType, saveVehicleProfileAction, setOperational } = useApp();
  const { vehicleProfiles, activeVehicleType, operationalInput, fixedCostResult } = state;

  const typeOptions: VehicleType[] = ["COMBUSTAO", "ELETRICO"];
  const typeIndex = typeOptions.indexOf(activeVehicleType);

  const activeProfile = vehicleProfiles.find((p) => p.type === activeVehicleType) ?? {
    id: activeVehicleType.toLowerCase(),
    type: activeVehicleType,
    precoEnergia: 0,
    autonomia: 0,
    margemDesejada: 0,
  };

  const [precoEnergia, setPrecoEnergia] = useState(activeProfile.precoEnergia);
  const [autonomia, setAutonomia] = useState(activeProfile.autonomia);
  const [margemDesejada, setMargemDesejada] = useState(activeProfile.margemDesejada);

  useEffect(() => {
    const p = vehicleProfiles.find((vp) => vp.type === activeVehicleType);
    setPrecoEnergia(p?.precoEnergia ?? 0);
    setAutonomia(p?.autonomia ?? 0);
    setMargemDesejada(p?.margemDesejada ?? 0);
  }, [activeVehicleType, vehicleProfiles]);

  const isCombustao = activeVehicleType === "COMBUSTAO";

  // Cálculos em tempo real do perfil
  const custoPorKm = autonomia > 0 ? precoEnergia / autonomia : 0;
  // Custo fixo por km (estimado para 100km/dia como referência)
  const custoFixoPorKmRef = 100 > 0 ? fixedCostResult.custoFixoDiario / 100 : 0;
  const custoPorKmTotal = custoPorKm + custoFixoPorKmRef;
  const valorMinimoKm = custoPorKmTotal + margemDesejada;

  const handleSwitchType = (i: number) => {
    setActiveVehicleType(typeOptions[i]);
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
    setOperational({
      ...operationalInput,
      tipoVeiculo: activeVehicleType,
      precoCombustivel: precoEnergia,
      autonomia,
      margemDesejadaPorKm: margemDesejada,
    });
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Perfis de Veículo</Text>
        <Text style={styles.subtitle}>
          Configure seu veículo e veja os cálculos de custo em tempo real.
          Para lançar um dia de trabalho, use a aba Lançamentos.
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
              title="Custo Combustível por KM"
              value={fmtKm(custoPorKm)}
              subtitle={autonomia > 0 ? `${fmt(precoEnergia)} ÷ ${autonomia} ${isCombustao ? "km/L" : "km/kWh"}` : "Informe preço e autonomia"}
              accentColor="#FF9500"
            />
            <ResultCard
              icon="account-balance"
              title="Custo Total por KM (c/ fixos)"
              value={fmtKm(custoPorKmTotal)}
              subtitle={`Combustível ${fmtKm(custoPorKm)} + Fixos ${fmtKm(custoFixoPorKmRef)} (ref. 100km)`}
              accentColor="#FF453A"
            />
            <ResultCard
              icon="verified"
              title="Valor Mínimo por KM"
              value={fmtKm(valorMinimoKm)}
              subtitle={`Custo total ${fmtKm(custoPorKmTotal)} + Margem ${fmtKm(margemDesejada)}`}
              accentColor="#00D4AA"
            />
          </View>
        )}

        {/* Custo fixo diário */}
        {fixedCostResult.custoFixoDiario > 0 && (
          <View style={styles.fixedCard}>
            <Text style={styles.fixedCardTitle}>Custo Fixo Diluído</Text>
            <View style={styles.fixedRow}>
              <Text style={styles.fixedLabel}>Custo Fixo por Dia</Text>
              <Text style={styles.fixedValue}>{fmt(fixedCostResult.custoFixoDiario)}</Text>
            </View>
            <Text style={styles.fixedHint}>
              Calculado como: custos mensais ÷ 30 + custos anuais ÷ 12 ÷ 30.
              Este valor é descontado automaticamente do lucro líquido.
            </Text>
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
  fixedCard: {
    backgroundColor: "#111111", borderRadius: 14, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: "#FF9500" + "44",
  },
  fixedCardTitle: { color: "#FF9500", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  fixedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  fixedLabel: { color: "#8E8E93", fontSize: 14 },
  fixedValue: { color: "#FF9500", fontSize: 18, fontWeight: "700" },
  fixedHint: { color: "#555555", fontSize: 12, lineHeight: 18 },
  compCard: {
    backgroundColor: "#111111", borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#1C1C1E",
  },
  compCardActive: { borderColor: "#0A84FF" },
  compCardTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginBottom: 4 },
  compCardText: { color: "#8E8E93", fontSize: 13, lineHeight: 18 },
  compCardCost: { color: "#FF9500", fontSize: 13, fontWeight: "600", marginTop: 4 },
});
