import { Text, View, StyleSheet, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AnimatedBarChart } from "@/components/animated-bar-chart";
import { useApp } from "@/lib/app-context";
import type { PeriodFilter, ReportItem } from "@/lib/types";

const FILTER_OPTIONS: PeriodFilter[] = ["DAY", "WEEK", "MONTH"];
const FILTER_LABELS = ["Dia", "Semana", "Mês"];

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function ReportRow({ item }: { item: ReportItem }) {
  const isPositive = item.totalProfit >= 0;
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowPeriod}>{item.period}</Text>
        <Text style={styles.rowDetail}>
          {item.totalKm.toFixed(0)} km  |  Custo: {fmt(item.totalCost)}
        </Text>
      </View>
      <Text
        style={[
          styles.rowProfit,
          { color: isPositive ? "#30D158" : "#FF453A" },
        ]}
      >
        {isPositive ? "+" : ""}
        {fmt(item.totalProfit)}
      </Text>
    </View>
  );
}

export default function ReportsScreen() {
  const { state, setPeriodFilter } = useApp();
  const filterIndex = FILTER_OPTIONS.indexOf(state.periodFilter);

  const totalProfit = state.reports.reduce((sum, r) => sum + r.totalProfit, 0);
  const totalKm = state.reports.reduce((sum, r) => sum + r.totalKm, 0);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Relatórios</Text>
        <Text style={styles.subtitle}>
          Acompanhe seus resultados por período
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <SegmentedControl
          options={FILTER_LABELS}
          selectedIndex={filterIndex}
          onSelect={(i) => setPeriodFilter(FILTER_OPTIONS[i])}
        />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Lucro Total</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: totalProfit >= 0 ? "#30D158" : "#FF453A" },
            ]}
          >
            {fmt(totalProfit)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>KM Total</Text>
          <Text style={styles.summaryValue}>{totalKm.toFixed(0)} km</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <AnimatedBarChart data={state.reports} height={220} />
      </View>

      <FlatList
        data={state.reports}
        keyExtractor={(item) => item.period}
        renderItem={({ item }) => <ReportRow item={item} />}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyListText}>
              Nenhum registro encontrado
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
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
    marginBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#111111",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1C1C1E",
  },
  summaryLabel: {
    color: "#8E8E93",
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  chartContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1C1C1E",
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  rowPeriod: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  rowDetail: {
    color: "#8E8E93",
    fontSize: 12,
  },
  rowProfit: {
    fontSize: 17,
    fontWeight: "700",
  },
  emptyList: {
    padding: 40,
    alignItems: "center",
  },
  emptyListText: {
    color: "#555555",
    fontSize: 14,
  },
});
