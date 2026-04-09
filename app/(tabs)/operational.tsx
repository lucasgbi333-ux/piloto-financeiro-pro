import {
  ScrollView, Text, View, StyleSheet, TouchableOpacity, Platform, TextInput, Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { InputField } from "@/components/ui/input-field";
import { ResultCard } from "@/components/ui/result-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useApp } from "@/lib/app-context";
import type { OperationalInput, VehicleType } from "@/lib/types";
import * as Haptics from "expo-haptics";
import { useState } from "react";

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}
function fmtKm(val: number): string {
  return `R$ ${val.toFixed(3).replace(".", ",")}/km`;
}

export default function OperationalScreen() {
  const { state, setOperational, setActiveVehicleType, recordDayWithTransactions, resetOperational } = useApp();
  const { operationalInput: input, operationalResult: result, activeProfile } = state;

  // Data editável para o registro
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const vehicleOptions: VehicleType[] = ["COMBUSTAO", "ELETRICO"];
  const vehicleIndex = vehicleOptions.indexOf(input.tipoVeiculo);

  const updateInput = (partial: Partial<OperationalInput>) => {
    setOperational({ ...input, ...partial });
  };

  const handleSwitchVehicle = (i: number) => {
    const newType = vehicleOptions[i];
    // Atualiza perfil ativo e preenche campos do perfil salvo
    setActiveVehicleType(newType);
    setOperational({
      ...input,
      tipoVeiculo: newType,
      precoCombustivel: activeProfile.precoEnergia,
      autonomia: activeProfile.autonomia,
      margemDesejadaPorKm: activeProfile.margemDesejada,
    });
  };

  const usingRealCost = input.gastoAbastecimento > 0;

  const handleClear = () => {
    Alert.alert(
      "Limpar Dados do Dia",
      "Isso vai zerar todos os campos operacionais e atualizar o Dashboard. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            resetOperational();
            setSelectedDate(new Date().toISOString().split("T")[0]);
          },
        },
      ]
    );
  };

  const handleSaveDay = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const now = Date.now();
    recordDayWithTransactions({
      id: `${selectedDate}-${now}`,
      date: selectedDate,
      kmRodado: input.kmRodadoDia,
      ganho: input.ganhoDia,
      custo: result.custoTotalDiaReal,
      createdAt: now,
      updatedAt: now,
    });
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Custo Operacional</Text>
        <Text style={styles.subtitle}>
          Calcule o custo por KM e o lucro real. Os dados do perfil ativo são carregados automaticamente.
        </Text>

        {/* Tipo de veículo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tipo de Veículo</Text>
          <SegmentedControl
            options={["Combustão", "Elétrico"]}
            selectedIndex={vehicleIndex}
            onSelect={handleSwitchVehicle}
          />
        </View>

        {/* Perfil ativo */}
        {(activeProfile.precoEnergia > 0 || activeProfile.autonomia > 0) && (
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>
              {input.tipoVeiculo === "COMBUSTAO" ? "⛽" : "🔋"} Perfil ativo: R$ {activeProfile.precoEnergia.toFixed(2).replace(".", ",")} · {activeProfile.autonomia} {input.tipoVeiculo === "COMBUSTAO" ? "km/L" : "km/kWh"}
            </Text>
          </View>
        )}

        {/* Inputs de energia */}
        <View style={styles.section}>
          <InputField
            label={input.tipoVeiculo === "COMBUSTAO" ? "Preço do Combustível (L)" : "Preço kWh"}
            value={input.precoCombustivel}
            onChangeValue={(n) => updateInput({ precoCombustivel: n })}
            placeholder={activeProfile.precoEnergia > 0 ? activeProfile.precoEnergia.toFixed(2) : "0,00"}
            suffix="R$"
          />
          <InputField
            label={input.tipoVeiculo === "COMBUSTAO" ? "Autonomia (km/L)" : "Autonomia (km/kWh)"}
            value={input.autonomia}
            onChangeValue={(n) => updateInput({ autonomia: n })}
            placeholder={activeProfile.autonomia > 0 ? String(activeProfile.autonomia) : "0"}
            suffix={input.tipoVeiculo === "COMBUSTAO" ? "km/L" : "km/kWh"}
          />
        </View>

        {/* Dados do dia */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Dados do Dia</Text>
          <InputField
            label="KM Rodados"
            value={input.kmRodadoDia}
            onChangeValue={(n) => updateInput({ kmRodadoDia: n })}
            placeholder="0"
            suffix="km"
          />
          <InputField
            label="Ganho do Dia"
            value={input.ganhoDia}
            onChangeValue={(n) => updateInput({ ganhoDia: n })}
            placeholder="0,00"
            suffix="R$"
          />
          <InputField
            label="Margem Desejada por KM"
            value={input.margemDesejadaPorKm}
            onChangeValue={(n) => updateInput({ margemDesejadaPorKm: n })}
            placeholder={activeProfile.margemDesejada > 0 ? activeProfile.margemDesejada.toFixed(2) : "0,00"}
            suffix="R$/km"
          />
        </View>

        {/* Abastecimento real */}
        <View style={styles.fuelSection}>
          <Text style={styles.fuelTitle}>
            {input.tipoVeiculo === "COMBUSTAO" ? "⛽ Abastecimento de Hoje" : "🔋 Recarga de Hoje"}
          </Text>
          <Text style={styles.fuelSubtitle}>
            {input.tipoVeiculo === "COMBUSTAO"
              ? "Quanto você gastou no posto hoje? (opcional)"
              : "Quanto você gastou na recarga elétrica hoje? (opcional)"}
          </Text>
          <InputField
            label={input.tipoVeiculo === "COMBUSTAO" ? "Valor Abastecido" : "Valor Recarregado"}
            value={input.gastoAbastecimento}
            onChangeValue={(n) => updateInput({ gastoAbastecimento: n })}
            placeholder="0,00 (opcional)"
            suffix="R$"
          />
          {usingRealCost ? (
            <View style={styles.fuelNoteReal}>
              <Text style={styles.fuelNoteRealText}>
                ✓ Usando custo real: {fmt(input.gastoAbastecimento)}
              </Text>
            </View>
          ) : (
            <View style={styles.fuelNoteEstimated}>
              <Text style={styles.fuelNoteEstimatedText}>
                ℹ Usando custo estimado: {fmt(result.custoTotalDiaEstimado)}
              </Text>
            </View>
          )}
        </View>

        {/* Resultados */}
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Resultados</Text>
          <ResultCard
            icon="speed"
            title="Custo por KM (estimado)"
            value={fmtKm(result.custoPorKm)}
            subtitle="Baseado no preço e autonomia"
            accentColor="#FF9500"
          />
          <ResultCard
            icon="local-gas-station"
            title={usingRealCost ? "Custo Real do Dia" : "Custo Estimado do Dia"}
            value={fmt(result.custoTotalDiaReal)}
            subtitle={usingRealCost ? `Gasto real: ${fmt(input.gastoAbastecimento)}` : `Estimado: ${fmt(result.custoTotalDiaEstimado)}`}
            accentColor={usingRealCost ? "#FF453A" : "#FF9500"}
          />
          <ResultCard
            icon="trending-up"
            title="Lucro por KM"
            value={fmtKm(result.lucroPorKm)}
            subtitle={`Calculado com custo ${usingRealCost ? "real" : "estimado"}`}
            accentColor={result.lucroPorKm >= 0 ? "#30D158" : "#FF453A"}
          />
          <ResultCard
            icon="account-balance-wallet"
            title="Lucro Líquido do Dia"
            value={fmt(result.lucroDia)}
            subtitle={`Ganho ${fmt(input.ganhoDia)} − Custo ${fmt(result.custoTotalDiaReal)}`}
            accentColor={result.lucroDia >= 0 ? "#30D158" : "#FF453A"}
          />
          <ResultCard
            icon="verified"
            title="Valor Mínimo por KM"
            value={fmtKm(result.valorMinimoKm)}
            subtitle="Aceite corridas acima deste valor"
            accentColor="#00D4AA"
          />
        </View>

        {/* Data do registro */}
        <View style={styles.dateSection}>
          <Text style={styles.dateSectionLabel}>Data do Registro</Text>
          <View style={styles.dateInputRow}>
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={(t: string) => {
                // Aceita formato AAAA-MM-DD
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
          <Text style={styles.dateSectionHint}>
            Você pode registrar dados de qualquer data — hoje ou dias anteriores.
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear} activeOpacity={0.8}>
            <Text style={styles.clearButtonText}>Limpar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveDay} activeOpacity={0.8}>
            <Text style={styles.saveButtonText}>Salvar Dia</Text>
          </TouchableOpacity>
        </View>
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
  profileBadge: {
    backgroundColor: "rgba(10, 132, 255, 0.1)", borderRadius: 10,
    padding: 10, marginBottom: 16, borderWidth: 1,
    borderColor: "rgba(10, 132, 255, 0.3)",
  },
  profileBadgeText: { color: "#0A84FF", fontSize: 13, fontWeight: "500" },
  fuelSection: {
    backgroundColor: "#111111", borderRadius: 16, padding: 16,
    marginBottom: 28, borderWidth: 1, borderColor: "#1C1C1E",
  },
  fuelTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", marginBottom: 4 },
  fuelSubtitle: { color: "#8E8E93", fontSize: 13, lineHeight: 18, marginBottom: 16 },
  fuelNoteReal: { backgroundColor: "rgba(0, 212, 170, 0.1)", borderRadius: 8, padding: 10, marginTop: -4 },
  fuelNoteRealText: { color: "#00D4AA", fontSize: 13, fontWeight: "500" },
  fuelNoteEstimated: { backgroundColor: "rgba(255, 149, 0, 0.1)", borderRadius: 8, padding: 10, marginTop: -4 },
  fuelNoteEstimatedText: { color: "#FF9500", fontSize: 13, fontWeight: "500" },
  resultsSection: { marginBottom: 24 },
  resultsTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginBottom: 16 },
  dateSection: {
    backgroundColor: "#111111", borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: "#1C1C1E",
  },
  dateSectionLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  dateSectionHint: { color: "#8E8E93", fontSize: 12, lineHeight: 18, marginTop: 4 },
  buttonRow: {
    flexDirection: "row", gap: 12, marginBottom: 20,
  },
  clearButton: {
    flex: 1, backgroundColor: "#1C1C1E", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    borderWidth: 1, borderColor: "#FF453A",
  },
  clearButtonText: { color: "#FF453A", fontSize: 17, fontWeight: "700" },
  saveButton: {
    flex: 2, backgroundColor: "#00D4AA", borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
  },
  saveButtonText: { color: "#000000", fontSize: 17, fontWeight: "700" },
  dateInputRow: {
    backgroundColor: "#111111", borderRadius: 12, borderWidth: 1,
    borderColor: "#1C1C1E", paddingHorizontal: 16, height: 50,
    justifyContent: "center",
  },
  dateInput: {
    color: "#FFFFFF", fontSize: 17, fontWeight: "600",
  },
});
