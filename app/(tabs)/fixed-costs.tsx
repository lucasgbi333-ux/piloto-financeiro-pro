import { ScrollView, Text, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { InputField } from "@/components/ui/input-field";
import { ResultCard } from "@/components/ui/result-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useApp } from "@/lib/app-context";
import type { FixedCostInput, RentalType } from "@/lib/types";

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

  const parseNum = (text: string): number => {
    const cleaned = text.replace(",", ".");
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  };

  const rentalOptions: RentalType[] = ["SEMANAL", "MENSAL"];
  const rentalIndex = rentalOptions.indexOf(input.tipoAluguel);

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Custos Fixos</Text>
        <Text style={styles.subtitle}>
          Configure seus custos fixos mensais para calcular quanto precisa gerar por dia.
        </Text>

        <View style={styles.section}>
          <InputField
            label="IPVA Anual"
            value={input.ipvaAnual > 0 ? String(input.ipvaAnual) : ""}
            onChangeText={(t) => update({ ipvaAnual: parseNum(t) })}
            placeholder="0,00"
            suffix="R$"
          />

          <InputField
            label="Financiamento Mensal"
            value={input.financiamentoMensal > 0 ? String(input.financiamentoMensal) : ""}
            onChangeText={(t) => update({ financiamentoMensal: parseNum(t) })}
            placeholder="0,00 (opcional)"
            suffix="R$"
          />

          <Text style={styles.sectionLabel}>Aluguel do Veículo</Text>
          <SegmentedControl
            options={["Semanal", "Mensal"]}
            selectedIndex={rentalIndex}
            onSelect={(i) => update({ tipoAluguel: rentalOptions[i] })}
          />

          <InputField
            label="Valor do Aluguel"
            value={input.aluguelValor > 0 ? String(input.aluguelValor) : ""}
            onChangeText={(t) => update({ aluguelValor: parseNum(t) })}
            placeholder="0,00 (opcional)"
            suffix="R$"
          />

          <InputField
            label="Internet Mensal"
            value={input.internetMensal > 0 ? String(input.internetMensal) : ""}
            onChangeText={(t) => update({ internetMensal: parseNum(t) })}
            placeholder="0,00"
            suffix="R$"
          />

          <InputField
            label="Outros Custos"
            value={input.outrosCustos > 0 ? String(input.outrosCustos) : ""}
            onChangeText={(t) => update({ outrosCustos: parseNum(t) })}
            placeholder="0,00"
            suffix="R$"
          />
        </View>

        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Resultados</Text>
          <ResultCard
            icon="calendar-today"
            title="Custo Mensal"
            value={fmt(result.custoMensalTotal)}
            accentColor="#0A84FF"
          />
          <ResultCard
            icon="date-range"
            title="Custo Anual"
            value={fmt(result.custoAnualTotal)}
            accentColor="#FF9500"
          />
          <ResultCard
            icon="today"
            title="Necessário por Dia"
            value={fmt(result.custoDiarioNecessario)}
            subtitle="Para cobrir seus custos fixos"
            accentColor="#00D4AA"
          />
        </View>
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
    marginBottom: 20,
  },
  resultsTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
});
