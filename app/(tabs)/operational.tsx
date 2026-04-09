import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { InputField } from "@/components/ui/input-field";
import { ResultCard } from "@/components/ui/result-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useApp } from "@/lib/app-context";
import type { OperationalInput, RealCostInput, VehicleType, CalculationMode } from "@/lib/types";
import * as Haptics from "expo-haptics";

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function fmtKm(val: number): string {
  return `R$ ${val.toFixed(3).replace(".", ",")}/km`;
}

export default function OperationalScreen() {
  const { state, setOperational, setRealCostInput, setCalculationMode, addDailyRecord } = useApp();

  const input = state.operationalInput;
  const result = state.operationalResult;
  const realInput = state.realCostInput;
  const realResult = state.realCostResult;
  const mode = state.calculationMode;

  const updateEstimated = (partial: Partial<OperationalInput>) => {
    setOperational({ ...input, ...partial });
  };

  const updateReal = (partial: Partial<RealCostInput>) => {
    setRealCostInput({ ...realInput, ...partial });
  };

  const vehicleOptions: VehicleType[] = ["COMBUSTAO", "ELETRICO"];
  const vehicleIndex = vehicleOptions.indexOf(input.tipoVeiculo);

  const modeOptions: CalculationMode[] = ["ESTIMATED", "REAL"];
  const modeIndex = modeOptions.indexOf(mode);

  const usingRealCost = input.gastoAbastecimento > 0;

  const handleSaveDay = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const today = new Date().toISOString().split("T")[0];

    if (mode === "REAL" && realResult.isValid) {
      // Modo Real: usa custo = valorAbastecido, ganho = valorPorKmRecebido * kmRodado
      addDailyRecord({
        date: today,
        kmRodado: realInput.kmRodado,
        ganho: realInput.valorPorKmRecebido * realInput.kmRodado,
        custo: realInput.valorAbastecido,
      });
    } else {
      // Modo Estimado: usa dados do cálculo estimado
      addDailyRecord({
        date: today,
        kmRodado: input.kmRodadoDia,
        ganho: input.ganhoDia,
        custo: result.custoTotalDiaReal,
      });
    }
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

        {/* Toggle de modo */}
        <View style={styles.modeSection}>
          <Text style={styles.modeLabel}>Modo de Cálculo</Text>
          <SegmentedControl
            options={["Estimado", "Real"]}
            selectedIndex={modeIndex}
            onSelect={(i) => setCalculationMode(modeOptions[i])}
          />
          <View style={styles.modeDescription}>
            {mode === "ESTIMATED" ? (
              <Text style={styles.modeDescText}>
                📊 <Text style={styles.modeBold}>Estimado:</Text> calcula com base no preço do combustível e autonomia do veículo.
              </Text>
            ) : (
              <Text style={styles.modeDescText}>
                🎯 <Text style={styles.modeBold}>Real:</Text> calcula com base no valor abastecido e km rodados — resultado mais preciso.
              </Text>
            )}
          </View>
        </View>

        {/* ===== MODO ESTIMADO ===== */}
        {mode === "ESTIMATED" && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tipo de Veículo</Text>
              <SegmentedControl
                options={["Combustão", "Elétrico"]}
                selectedIndex={vehicleIndex}
                onSelect={(i) => updateEstimated({ tipoVeiculo: vehicleOptions[i] })}
              />

              <InputField
                label={input.tipoVeiculo === "COMBUSTAO" ? "Preço do Combustível (L)" : "Preço kWh"}
                value={input.precoCombustivel}
                onChangeValue={(n) => updateEstimated({ precoCombustivel: n })}
                placeholder="0,00"
                suffix="R$"
              />

              <InputField
                label={input.tipoVeiculo === "COMBUSTAO" ? "Autonomia (km/L)" : "Autonomia (km/kWh)"}
                value={input.autonomia}
                onChangeValue={(n) => updateEstimated({ autonomia: n })}
                placeholder="0"
                suffix={input.tipoVeiculo === "COMBUSTAO" ? "km/L" : "km/kWh"}
              />

              <InputField
                label="KM Rodados Hoje"
                value={input.kmRodadoDia}
                onChangeValue={(n) => updateEstimated({ kmRodadoDia: n })}
                placeholder="0"
                suffix="km"
              />

              <InputField
                label="Ganho do Dia"
                value={input.ganhoDia}
                onChangeValue={(n) => updateEstimated({ ganhoDia: n })}
                placeholder="0,00"
                suffix="R$"
              />

              <InputField
                label="Margem Desejada por KM"
                value={input.margemDesejadaPorKm}
                onChangeValue={(n) => updateEstimated({ margemDesejadaPorKm: n })}
                placeholder="0,00"
                suffix="R$/km"
              />
            </View>

            {/* Gasto real com combustível/recarga (opcional no modo estimado) */}
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
                onChangeValue={(n) => updateEstimated({ gastoAbastecimento: n })}
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

            {/* Resultados Modo Estimado */}
            <View style={styles.resultsSection}>
              <Text style={styles.resultsTitle}>Resultados — Estimado</Text>

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
          </>
        )}

        {/* ===== MODO REAL ===== */}
        {mode === "REAL" && (
          <>
            <View style={styles.realBadge}>
              <Text style={styles.realBadgeText}>🎯 Cálculo baseado em dados reais do dia</Text>
            </View>

            <View style={styles.section}>
              <InputField
                label="KM Rodados Hoje"
                value={realInput.kmRodado}
                onChangeValue={(n) => updateReal({ kmRodado: n })}
                placeholder="0"
                suffix="km"
              />

              <InputField
                label={`Valor ${input.tipoVeiculo === "ELETRICO" ? "Recarregado" : "Abastecido"} Hoje`}
                value={realInput.valorAbastecido}
                onChangeValue={(n) => updateReal({ valorAbastecido: n })}
                placeholder="0,00"
                suffix="R$"
              />

              <InputField
                label="Valor Recebido por KM"
                value={realInput.valorPorKmRecebido}
                onChangeValue={(n) => updateReal({ valorPorKmRecebido: n })}
                placeholder="0,00"
                suffix="R$/km"
              />
            </View>

            {/* Resultados Modo Real */}
            <View style={styles.resultsSection}>
              <Text style={styles.resultsTitle}>Resultados — Real</Text>

              {!realResult.isValid ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{realResult.errorMessage}</Text>
                </View>
              ) : (
                <>
                  <ResultCard
                    icon="local-gas-station"
                    title="Custo Real por KM"
                    value={fmtKm(realResult.custoPorKmReal)}
                    subtitle={`${fmt(realInput.valorAbastecido)} ÷ ${realInput.kmRodado} km`}
                    accentColor="#FF453A"
                  />

                  <ResultCard
                    icon="trending-up"
                    title="Lucro Real por KM"
                    value={fmtKm(realResult.lucroPorKmReal)}
                    subtitle={`${fmtKm(realInput.valorPorKmRecebido)} − ${fmtKm(realResult.custoPorKmReal)}`}
                    accentColor={realResult.lucroPorKmReal >= 0 ? "#30D158" : "#FF453A"}
                  />

                  <ResultCard
                    icon="account-balance-wallet"
                    title="Lucro Total do Dia"
                    value={fmt(realResult.lucroPorKmReal * realInput.kmRodado)}
                    subtitle={`Lucro/km × ${realInput.kmRodado} km rodados`}
                    accentColor={realResult.lucroPorKmReal >= 0 ? "#30D158" : "#FF453A"}
                  />

                  <ResultCard
                    icon="speed"
                    title="Custo Total do Dia"
                    value={fmt(realInput.valorAbastecido)}
                    subtitle="Valor real gasto no abastecimento"
                    accentColor="#FF9500"
                  />
                </>
              )}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.saveButton,
            mode === "REAL" && !realResult.isValid && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveDay}
          activeOpacity={0.8}
          disabled={mode === "REAL" && !realResult.isValid}
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
  modeSection: {
    marginBottom: 28,
  },
  modeLabel: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modeDescription: {
    backgroundColor: "#111111",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#1C1C1E",
  },
  modeDescText: {
    color: "#8E8E93",
    fontSize: 13,
    lineHeight: 18,
  },
  modeBold: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  realBadge: {
    backgroundColor: "rgba(0, 212, 170, 0.1)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.3)",
  },
  realBadgeText: {
    color: "#00D4AA",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
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
  errorCard: {
    backgroundColor: "rgba(255, 69, 58, 0.1)",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 69, 58, 0.3)",
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    color: "#FF453A",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },
  saveButton: {
    backgroundColor: "#00D4AA",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: "#1C1C1E",
  },
  saveButtonText: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "700",
  },
});
