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

  const handleSaveDay = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const today = new Date().toISOString().split("T")[0];
    // Custo do dia = custo por km * km rodados + gasto real com abastecimento (se informado)
    const custoFinal =
      input.gastoAbastecimento > 0
        ? input.gastoAbastecimento
        : result.custoTotalDia;
    addDailyRecord({
      date: today,
      kmRodado: input.kmRodadoDia,
      ganho: input.ganhoDia,
      custo: custoFinal,
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
          Calcule o custo por KM e o lucro do seu dia de trabalho.
        </Text>

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

        {/* Seção de gasto real com combustível/recarga */}
        <View style={styles.fuelSection}>
          <Text style={styles.fuelTitle}>
            {input.tipoVeiculo === "COMBUSTAO" ? "⛽ Abastecimento de Hoje" : "🔋 Recarga de Hoje"}
          </Text>
          <Text style={styles.fuelSubtitle}>
            {input.tipoVeiculo === "COMBUSTAO"
              ? "Informe o valor gasto no abastecimento (ex: R$ 70,00)"
              : "Informe o valor gasto na recarga elétrica (ex: R$ 50,00)"}
          </Text>
          <InputField
            label={input.tipoVeiculo === "COMBUSTAO" ? "Valor Abastecido" : "Valor Recarregado"}
            value={input.gastoAbastecimento}
            onChangeValue={(n) => update({ gastoAbastecimento: n })}
            placeholder="0,00 (opcional)"
            suffix="R$"
          />
          {input.gastoAbastecimento > 0 && (
            <View style={styles.fuelNote}>
              <Text style={styles.fuelNoteText}>
                ✓ O custo real de {fmt(input.gastoAbastecimento)} será usado ao salvar o dia
              </Text>
            </View>
          )}
        </View>

        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Resultados</Text>
          <ResultCard
            icon="speed"
            title="Custo por KM"
            value={fmtKm(result.custoPorKm)}
            accentColor="#FF9500"
          />
          <ResultCard
            icon="payments"
            title="Custo Total do Dia (estimado)"
            value={fmt(result.custoTotalDia)}
            subtitle={
              input.gastoAbastecimento > 0
                ? `Custo real informado: ${fmt(input.gastoAbastecimento)}`
                : "Baseado no preço e km rodados"
            }
            accentColor="#FF453A"
          />
          <ResultCard
            icon="trending-up"
            title="Lucro por KM"
            value={fmtKm(result.lucroPorKm)}
            accentColor={result.lucroPorKm >= 0 ? "#30D158" : "#FF453A"}
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
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
  section: {
    marginBottom: 8,
  },
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
  fuelNote: {
    backgroundColor: "rgba(0, 212, 170, 0.1)",
    borderRadius: 8,
    padding: 10,
    marginTop: -4,
  },
  fuelNoteText: {
    color: "#00D4AA",
    fontSize: 13,
    fontWeight: "500",
  },
  resultsSection: {
    marginBottom: 24,
  },
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
