import { ScrollView, Text, View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { InputField } from "@/components/ui/input-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useApp } from "@/lib/app-context";
import type { VehicleType, VehicleProfile } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { useState } from "react";

export default function VehicleProfilesScreen() {
  const { state, setActiveVehicleType, saveVehicleProfileAction } = useApp();
  const { vehicleProfiles, activeVehicleType } = state;

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

  const handleSwitchType = (i: number) => {
    const newType = typeOptions[i];
    setActiveVehicleType(newType);
    const p = vehicleProfiles.find((vp) => vp.type === newType);
    setPrecoEnergia(p?.precoEnergia ?? 0);
    setAutonomia(p?.autonomia ?? 0);
    setMargemDesejada(p?.margemDesejada ?? 0);
  };

  const handleSave = () => {
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
  };

  const isCombustao = activeVehicleType === "COMBUSTAO";

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Perfis de Veículo</Text>
        <Text style={styles.subtitle}>
          Configure separadamente os dados de cada tipo de veículo. O perfil ativo é usado automaticamente nos cálculos operacionais.
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
        <View style={[styles.activeBadge, isCombustao ? styles.activeBadgeCombustao : styles.activeBadgeEletrico]}>
          <Text style={[styles.activeBadgeText, isCombustao ? styles.activeBadgeTextCombustao : styles.activeBadgeTextEletrico]}>
            {isCombustao ? "⛽ Perfil Combustão — Ativo" : "🔋 Perfil Elétrico — Ativo"}
          </Text>
        </View>

        {/* Campos do perfil */}
        <View style={styles.section}>
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
        </View>

        {/* Resumo do custo estimado */}
        {precoEnergia > 0 && autonomia > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Custo estimado por KM</Text>
            <Text style={styles.summaryValue}>
              R$ {(precoEnergia / autonomia).toFixed(3).replace(".", ",")}/km
            </Text>
            <Text style={styles.summarySubtitle}>
              Valor mínimo por KM: R$ {((precoEnergia / autonomia) + margemDesejada).toFixed(3).replace(".", ",")}
            </Text>
          </View>
        )}

        {/* Comparação entre perfis */}
        {vehicleProfiles.length >= 2 && (
          <View style={styles.comparisonSection}>
            <Text style={styles.comparisonTitle}>Comparação de Perfis</Text>
            {vehicleProfiles.map((p) => (
              <View key={p.type} style={[styles.comparisonCard, p.type === activeVehicleType && styles.comparisonCardActive]}>
                <Text style={styles.comparisonCardTitle}>
                  {p.type === "COMBUSTAO" ? "⛽ Combustão" : "🔋 Elétrico"}
                  {p.type === activeVehicleType ? " (ativo)" : ""}
                </Text>
                <Text style={styles.comparisonCardText}>
                  Preço: R$ {p.precoEnergia.toFixed(2).replace(".", ",")} · Autonomia: {p.autonomia} {p.type === "COMBUSTAO" ? "km/L" : "km/kWh"}
                </Text>
                {p.precoEnergia > 0 && p.autonomia > 0 && (
                  <Text style={styles.comparisonCardCost}>
                    Custo/km: R$ {(p.precoEnergia / p.autonomia).toFixed(3).replace(".", ",")}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>
            Salvar Perfil {isCombustao ? "Combustão" : "Elétrico"}
          </Text>
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
  activeBadgeCombustao: {
    backgroundColor: "rgba(255, 149, 0, 0.1)",
    borderColor: "rgba(255, 149, 0, 0.3)",
  },
  activeBadgeEletrico: {
    backgroundColor: "rgba(0, 212, 170, 0.1)",
    borderColor: "rgba(0, 212, 170, 0.3)",
  },
  activeBadgeText: { fontSize: 14, fontWeight: "600" },
  activeBadgeTextCombustao: { color: "#FF9500" },
  activeBadgeTextEletrico: { color: "#00D4AA" },
  summaryCard: {
    backgroundColor: "#111111", borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: "#1C1C1E",
  },
  summaryTitle: { color: "#8E8E93", fontSize: 13, fontWeight: "500", marginBottom: 4 },
  summaryValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "700", marginBottom: 4 },
  summarySubtitle: { color: "#8E8E93", fontSize: 13 },
  comparisonSection: { marginBottom: 24 },
  comparisonTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  comparisonCard: {
    backgroundColor: "#111111", borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: "#1C1C1E",
  },
  comparisonCardActive: { borderColor: "#0A84FF" },
  comparisonCardTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", marginBottom: 4 },
  comparisonCardText: { color: "#8E8E93", fontSize: 13, lineHeight: 18 },
  comparisonCardCost: { color: "#FF9500", fontSize: 13, fontWeight: "600", marginTop: 4 },
  saveButton: {
    backgroundColor: "#0A84FF", borderRadius: 14,
    paddingVertical: 16, alignItems: "center", marginBottom: 20,
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
