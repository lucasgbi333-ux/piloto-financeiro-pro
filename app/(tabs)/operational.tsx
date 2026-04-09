import {
  ScrollView, Text, View, StyleSheet, TouchableOpacity, Platform, Alert,
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

  // resetKey força remount de todos os InputField quando Limpar é acionado
  const [resetKey, setResetKey] = useState(0);

  const vehicleOptions: VehicleType[] = ["COMBUSTAO", "ELETRICO"];
  const vehicleIndex = vehicleOptions.indexOf(input.tipoVeiculo);

  const updateInput = (partial: Partial<OperationalInput>) => {
    setOperational({ ...input, ...partial });
  };

  const handleSwitchVehicle = (i: number) => {
    const newType = vehicleOptions[i];
    // Ao trocar o tipo, carrega o perfil operacional salvo daquele tipo
    // setActiveVehicleType já atualiza o operationalInput no contexto com o perfil salvo
    setActiveVehicleType(newType);
    // Incrementar resetKey para sincronizar os campos visuais com o novo perfil
    setResetKey((k) => k + 1);
  };

  // Usa isUsingRealCost do use-case (real = gastoAbastecimento > 0 E kmRodadoDia > 0)
  const usingRealCost = result.isUsingRealCost;

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
            // Incrementar resetKey força todos os InputField a remontarem com value=0
            setResetKey((k) => k + 1);
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
    const today = new Date().toISOString().split("T")[0];
    recordDayWithTransactions({
      id: `${today}-${now}`,
      date: today,
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

        {/* Inputs de energia — resetKey força remount ao limpar */}
        <View style={styles.section} key={`energy-${resetKey}`}>
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

        {/* Dados do dia — resetKey força remount ao limpar */}
        <View style={styles.section} key={`day-${resetKey}`}>
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

        {/* Abastecimento real — resetKey força remount ao limpar */}
        <View style={styles.fuelSection} key={`fuel-${resetKey}`}>
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
                ✓ Usando custo real baseado no seu {input.tipoVeiculo === "COMBUSTAO" ? "abastecimento" : "recarga elétrica"}
              </Text>
            </View>
          ) : (
            <View style={styles.fuelNoteEstimated}>
              <Text style={styles.fuelNoteEstimatedText}>
                ℹ Usando estimativa — adicione {input.tipoVeiculo === "COMBUSTAO" ? "abastecimento" : "recarga"} para maior precisão
              </Text>
            </View>
          )}
        </View>

        {/* Resultados */}
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Resultados</Text>

          {/* Custo por KM — exibe apenas o custo real quando disponível, senão estimado */}
          <ResultCard
            icon="speed"
            title={usingRealCost ? "Custo por KM (Real)" : "Custo por KM (Estimado)"}
            value={fmtKm(result.custoPorKm)}
            subtitle={
              usingRealCost
                ? `Baseado no gasto real: ${fmt(input.gastoAbastecimento)}`
                : `Adicione ${input.tipoVeiculo === "COMBUSTAO" ? "abastecimento" : "recarga"} para custo real`
            }
            accentColor={usingRealCost ? "#00D4AA" : "#FF9500"}
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
            value={fmt(result.lucroDiaLiquido)}
            subtitle={`Ganho ${fmt(input.ganhoDia)} − Custo ${fmt(result.custoTotalDiaReal)} − Fixos ${fmt(state.fixedCostResult.custoFixoDiario)}`}
            accentColor={result.lucroDiaLiquido >= 0 ? "#30D158" : "#FF453A"}
          />
          <ResultCard
            icon="verified"
            title="Valor Mínimo por KM"
            value={fmtKm(result.valorMinimoKm)}
            subtitle="Aceite corridas acima deste valor"
            accentColor="#00D4AA"
          />
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

});
