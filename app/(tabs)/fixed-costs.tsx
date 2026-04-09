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
          Configure seus custos fixos para calcular quanto precisa gerar por dia.
        </Text>

        <View style={styles.section}>
          <InputField
            label="IPVA Anual"
            value={input.ipvaAnual}
            onChangeValue={(n) => update({ ipvaAnual: n })}
            placeholder="0,00"
            suffix="R$"
          />

          <InputField
            label="Financiamento Mensal"
            value={input.financiamentoMensal}
            onChangeValue={(n) => update({ financiamentoMensal: n })}
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
            value={input.aluguelValor}
            onChangeValue={(n) => update({ aluguelValor: n })}
            placeholder="0,00 (opcional)"
            suffix="R$"
          />

          <InputField
            label="Internet Mensal"
            value={input.internetMensal}
            onChangeValue={(n) => update({ internetMensal: n })}
            placeholder="0,00"
            suffix="R$"
          />

          <InputField
            label="Outros Custos"
            value={input.outrosCustos}
            onChangeValue={(n) => update({ outrosCustos: n })}
            placeholder="0,00"
            suffix="R$"
          />
        </View>

        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Resultados</Text>

          <ResultCard
            icon="calendar-today"
            title="Custo Mensal Total"
            value={fmt(result.custoMensalTotal)}
            accentColor="#0A84FF"
          />

          <ResultCard
            icon="date-range"
            title="Custo Anual Total"
            value={fmt(result.custoAnualTotal)}
            accentColor="#FF9500"
          />

          {/* Necessário por dia para cobrir custos mensais */}
          <ResultCard
            icon="today"
            title="Necessário por Dia (Mensal)"
            value={fmt(result.custoDiarioNecessario)}
            subtitle="Para cobrir seus custos do mês atual"
            accentColor="#00D4AA"
          />

          {/* Necessário por dia para cobrir custos anuais */}
          <ResultCard
            icon="event-available"
            title="Necessário por Dia (Anual)"
            value={fmt(result.custoAnualTotal / 365)}
            subtitle="Para cobrir todos os custos do ano"
            accentColor="#30D158"
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
