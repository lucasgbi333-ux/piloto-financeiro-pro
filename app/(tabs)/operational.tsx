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

  const parseNum = (text: string): number => {
    const cleaned = text.replace(",", ".");
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  };

  const vehicleOptions: VehicleType[] = ["COMBUSTAO", "ELETRICO"];
  const vehicleIndex = vehicleOptions.indexOf(input.tipoVeiculo);

  const handleSaveDay = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const today = new Date().toISOString().split("T")[0];
    addDailyRecord({
      date: today,
      kmRodado: input.kmRodadoDia,
      ganho: input.ganhoDia,
      custo: result.custoTotalDia,
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
            value={input.precoCombustivel > 0 ? String(input.precoCombustivel) : ""}
            onChangeText={(t) => update({ precoCombustivel: parseNum(t) })}
            placeholder="0,00"
            suffix="R$"
          />

          <InputField
            label={input.tipoVeiculo === "COMBUSTAO" ? "Autonomia (km/L)" : "Autonomia (km/kWh)"}
            value={input.autonomia > 0 ? String(input.autonomia) : ""}
            onChangeText={(t) => update({ autonomia: parseNum(t) })}
            placeholder="0"
            suffix={input.tipoVeiculo === "COMBUSTAO" ? "km/L" : "km/kWh"}
          />

          <InputField
            label="KM Rodados Hoje"
            value={input.kmRodadoDia > 0 ? String(input.kmRodadoDia) : ""}
            onChangeText={(t) => update({ kmRodadoDia: parseNum(t) })}
            placeholder="0"
            suffix="km"
          />

          <InputField
            label="Ganho do Dia"
            value={input.ganhoDia > 0 ? String(input.ganhoDia) : ""}
            onChangeText={(t) => update({ ganhoDia: parseNum(t) })}
            placeholder="0,00"
            suffix="R$"
          />

          <InputField
            label="Margem Desejada por KM"
            value={input.margemDesejadaPorKm > 0 ? String(input.margemDesejadaPorKm) : ""}
            onChangeText={(t) => update({ margemDesejadaPorKm: parseNum(t) })}
            placeholder="0,00"
            suffix="R$/km"
          />
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
            title="Custo Total do Dia"
            value={fmt(result.custoTotalDia)}
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
          <Text style={styles.saveButtonText}>Salvar Dia</Text>
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
    marginBottom: 32,
  },
  sectionLabel: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
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
