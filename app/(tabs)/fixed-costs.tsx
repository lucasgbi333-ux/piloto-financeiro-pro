import {
  Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { InputField } from "@/components/ui/input-field";
import { ResultCard } from "@/components/ui/result-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useApp } from "@/lib/app-context";
import type { FixedCostInput, RentalType, InsuranceType } from "@/lib/types";
import * as Haptics from "expo-haptics";

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

export default function FixedCostsScreen() {
  const { state, setFixedCosts } = useApp();
  const input = state.fixedCostInput;
  const result = state.fixedCostResult;

  const update = (partial: Partial<FixedCostInput>) => {
    setFixedCosts({ ...input, ...partial });
  };

  const handleReset = () => {
    const doReset = () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFixedCosts({
        ipvaAnual: 0,
        financiamentoMensal: 0,
        aluguelValor: 0,
        tipoAluguel: "MENSAL" as RentalType,
        internetMensal: 0,
        outrosCustos: 0,
        seguroValor: 0,
        tipoSeguro: "MENSAL" as InsuranceType,
      });
    };
    if (Platform.OS === "web") {
      if (window.confirm("Limpar todos os custos fixos?")) doReset();
    } else {
      Alert.alert("Limpar Custos Fixos", "Deseja zerar todos os valores?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Limpar", style: "destructive", onPress: doReset },
      ]);
    }
  };

  const rentalOptions: RentalType[] = ["SEMANAL", "MENSAL"];
  const rentalIndex = rentalOptions.indexOf(input.tipoAluguel);

  const insuranceOptions: InsuranceType[] = ["MENSAL", "ANUAL"];
  const insuranceIndex = insuranceOptions.indexOf(input.tipoSeguro);

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Custos Fixos</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
            <Text style={styles.resetBtnText}>Limpar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Configure seus custos fixos para calcular quanto precisa gerar por dia.
        </Text>

        {/* IPVA */}
        <View style={styles.section}>
          <InputField
            label="IPVA Anual"
            value={input.ipvaAnual}
            onChangeValue={(n) => update({ ipvaAnual: n })}
            placeholder="0,00"
            suffix="R$/ano"
          />
        </View>

        {/* Financiamento */}
        <View style={styles.section}>
          <InputField
            label="Financiamento Mensal"
            value={input.financiamentoMensal}
            onChangeValue={(n) => update({ financiamentoMensal: n })}
            placeholder="0,00 (opcional)"
            suffix="R$/mês"
          />
        </View>

        {/* Aluguel */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Aluguel do Veículo</Text>
          <SegmentedControl
            options={["Semanal", "Mensal"]}
            selectedIndex={rentalIndex}
            onSelect={(i) => update({ tipoAluguel: rentalOptions[i] })}
          />
          <InputField
            label="Valor do Aluguel"
            value={input.aluguelValor}
            onChangeValue={(n) => update({ aluguelValor: n })}
            placeholder="0,00 (opcional)"
            suffix="R$"
          />
          {input.financiamentoMensal > 0 && input.aluguelValor > 0 && (
            <View style={styles.infoNote}>
              <Text style={styles.infoNoteText}>
                ℹ Financiamento tem prioridade sobre aluguel nos cálculos
              </Text>
            </View>
          )}
        </View>

        {/* Seguro */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Seguro do Veículo</Text>
          <SegmentedControl
            options={["Mensal", "Anual"]}
            selectedIndex={insuranceIndex}
            onSelect={(i) => update({ tipoSeguro: insuranceOptions[i] })}
          />
          <InputField
            label={input.tipoSeguro === "ANUAL" ? "Valor do Seguro (Anual)" : "Valor do Seguro (Mensal)"}
            value={input.seguroValor}
            onChangeValue={(n) => update({ seguroValor: n })}
            placeholder="0,00 (opcional)"
            suffix="R$"
          />
          {input.seguroValor > 0 && input.tipoSeguro === "ANUAL" && (
            <View style={styles.infoNote}>
              <Text style={styles.infoNoteText}>
                ℹ Parcela mensal: {fmt(input.seguroValor / 12)}
              </Text>
            </View>
          )}
        </View>

        {/* Internet e outros */}
        <View style={styles.section}>
          <InputField
            label="Internet Mensal"
            value={input.internetMensal}
            onChangeValue={(n) => update({ internetMensal: n })}
            placeholder="0,00"
            suffix="R$/mês"
          />
          <InputField
            label="Outros Custos Mensais"
            value={input.outrosCustos}
            onChangeValue={(n) => update({ outrosCustos: n })}
            placeholder="0,00"
            suffix="R$/mês"
          />
        </View>

        {/* Resultados */}
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Resultados</Text>

          <ResultCard
            icon="calendar-today"
            title="Custo Mensal Total"
            value={fmt(result.custoMensalTotal)}
            subtitle="Soma de todos os custos mensais"
            accentColor="#0A84FF"
          />

          <ResultCard
            icon="date-range"
            title="Custo Anual Total"
            value={fmt(result.custoAnualTotal)}
            subtitle="Projeção anual dos custos"
            accentColor="#FF9500"
          />

          <ResultCard
            icon="today"
            title="Necessário por Dia (Mensal)"
            value={fmt(result.custoDiarioNecessario)}
            subtitle="Para cobrir seus custos do mês (÷ 30 dias)"
            accentColor="#00D4AA"
          />

          <ResultCard
            icon="event-available"
            title="Necessário por Dia (Anual)"
            value={fmt(result.custoDiarioAnual)}
            subtitle="Para cobrir todos os custos do ano (÷ 365 dias)"
            accentColor="#30D158"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  resetBtn: {
    backgroundColor: "#FF453A22", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "#FF453A44",
  },
  resetBtnText: { color: "#FF453A", fontSize: 13, fontWeight: "600" },
  subtitle: {
    color: "#8E8E93",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  section: { marginBottom: 20 },
  sectionLabel: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoNote: {
    backgroundColor: "rgba(10, 132, 255, 0.1)",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  infoNoteText: {
    color: "#0A84FF",
    fontSize: 13,
    fontWeight: "500",
  },
  resultsSection: { marginBottom: 20 },
  resultsTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
});
