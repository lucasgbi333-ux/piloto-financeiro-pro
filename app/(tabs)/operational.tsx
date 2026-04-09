import { ScrollView, Text, View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { InputField } from "@/components/ui/input-field";
import { ResultCard } from "@/components/ui/result-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useApp } from "@/lib/app-context";
import type { OperationalInput, VehicleType } from "@/lib/types";
import * as Haptics from "expo-haptics";

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function fmtKm(val: number): string {
  return `R$ ${val.toFixed(3).replace(".", ",")}/km`;
}

export default function OperationalScreen() {
  const { state, setOperational, addDailyRecord } = useApp();
  const input = state.operationalInput;
  const result = state.operationalResult;

  const update = (partial: Partial<OperationalInput>) => {
    setOperational({ ...input, ...partial });
  };

  const vehicleOptions: VehicleType[] = ["COMBUSTAO", "ELETRICO"];
  const vehicleIndex = vehicleOptions.indexOf(input.tipoVeiculo);

  const usingRealCost = input.gastoAbastecimento > 0;

  const handleSaveDay = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const today = new Date().toISOString().split("T")[0];
    addDailyRecord({
      date: today,
      kmRodado: input.kmRodadoDia,
      ganho: input.ganhoDia,
      custo: result.custoTotalDiaReal,
    });
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Custo Operacional</Text>
        <Text style={styles.subtitle}>
          Calcule o custo por KM e o lucro real do seu dia de trabalho.
        </Text>

        {/* Tipo de veículo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tipo de Veículo</Text>
          <SegmentedControl
            options={["Combustão", "Elétrico"]}
            selectedIndex={vehicleIndex}
            onSelect={(i) => update({ tipoVeiculo: vehicleOptions[i] })}
          />

          <InputField
            label={input.tipoVeiculo === "COMBUSTAO" ? "Preço do Combustível (L)" : "Preço kWh"}
            value={input.precoCombustivel}
            onChangeValue={(n) => update({ precoCombustivel: n })}
            placeholder="0,00"
            suffix="R$"
          />

          <InputField
            label={input.tipoVeiculo === "COMBUSTAO" ? "Autonomia (km/L)" : "Autonomia (km/kWh)"}
            value={input.autonomia}
            onChangeValue={(n) => update({ autonomia: n })}
            placeholder="0"
            suffix={input.tipoVeiculo === "COMBUSTAO" ? "km/L" : "km/kWh"}
          />

          <InputField
            label="KM Rodados Hoje"
            value={input.kmRodadoDia}
            onChangeValue={(n) => update({ kmRodadoDia: n })}
            placeholder="0"
            suffix="km"
          />

          <InputField
            label="Ganho do Dia"
            value={input.ganhoDia}
            onChangeValue={(n) => update({ ganhoDia: n })}
            placeholder="0,00"
            suffix="R$"
          />

          <InputField
            label="Margem Desejada por KM"
            value={input.margemDesejadaPorKm}
            onChangeValue={(n) => update({ margemDesejadaPorKm: n })}
            placeholder="0,00"
            suffix="R$/km"
          />
        </View>

        {/* Gasto real com combustível/recarga */}
        <View style={styles.fuelSection}>
          <Text style={styles.fuelTitle}>
            {input.tipoVeiculo === "COMBUSTAO" ? "⛽ Abastecimento de Hoje" : "🔋 Recarga de Hoje"}
          </Text>
          <Text style={styles.fuelSubtitle}>
            {input.tipoVeiculo === "COMBUSTAO"
              ? "Quanto você gastou no posto hoje? (ex: R$ 70,00)"
              : "Quanto você gastou na recarga elétrica hoje? (ex: R$ 50,00)"}
          </Text>
          <InputField
            label={input.tipoVeiculo === "COMBUSTAO" ? "Valor Abastecido" : "Valor Recarregado"}
            value={input.gastoAbastecimento}
            onChangeValue={(n) => update({ gastoAbastecimento: n })}
            placeholder="0,00 (opcional)"
            suffix="R$"
          />
          {usingRealCost ? (
            <View style={styles.fuelNoteReal}>
              <Text style={styles.fuelNoteRealText}>
                ✓ Usando custo real: {fmt(input.gastoAbastecimento)} — lucro calculado com este valor
              </Text>
            </View>
          ) : (
            <View style={styles.fuelNoteEstimated}>
              <Text style={styles.fuelNoteEstimatedText}>
                ℹ Usando custo estimado: {fmt(result.custoTotalDiaEstimado)} (preço ÷ autonomia × km)
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
            subtitle={
              usingRealCost
                ? `Gasto real informado: ${fmt(input.gastoAbastecimento)}`
                : `Estimado: ${fmt(result.custoTotalDiaEstimado)}`
            }
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

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveDay}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Salvar Dia nos Relatórios</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: "#8E8E93",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  section: { marginBottom: 8 },
  sectionLabel: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fuelSection: {
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#1C1C1E",
  },
  fuelTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  fuelSubtitle: {
    color: "#8E8E93",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  fuelNoteReal: {
    backgroundColor: "rgba(0, 212, 170, 0.1)",
    borderRadius: 8,
    padding: 10,
    marginTop: -4,
  },
  fuelNoteRealText: {
    color: "#00D4AA",
    fontSize: 13,
    fontWeight: "500",
  },
  fuelNoteEstimated: {
    backgroundColor: "rgba(255, 149, 0, 0.1)",
    borderRadius: 8,
    padding: 10,
    marginTop: -4,
  },
  fuelNoteEstimatedText: {
    color: "#FF9500",
    fontSize: 13,
    fontWeight: "500",
  },
  resultsSection: { marginBottom: 24 },
  resultsTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "#00D4AA",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  saveButtonText: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "700",
  },
});
