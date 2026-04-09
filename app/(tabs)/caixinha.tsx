import {
  Text, View, StyleSheet, TouchableOpacity, FlatList, Alert, Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import * as Haptics from "expo-haptics";
import type { CaixinhaEntry } from "@/lib/types";

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export default function CaixinhaScreen() {
  const { state, deleteCaixinhaEntry } = useApp();
  const { caixinha } = state;

  const handleDelete = (entry: CaixinhaEntry) => {
    Alert.alert(
      "Remover Aporte",
      `Remover o aporte de ${formatDate(entry.date)} (${fmt(entry.total)})?\n\nIsso não remove o lançamento do dia.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            deleteCaixinhaEntry(entry.date);
          },
        },
      ]
    );
  };

  const sortedEntries = [...caixinha.entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ScreenContainer>
      <FlatList
        data={sortedEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Caixinha</Text>
            <Text style={styles.subtitle}>
              5% do ganho bruto vai para Manutenção e 5% para Reserva de Emergência automaticamente a cada lançamento.
            </Text>

            {/* Cards de saldo */}
            <View style={styles.balanceRow}>
              <View style={[styles.balanceCard, { borderColor: "#FF9500" }]}>
                <Text style={styles.balanceIcon}>🔧</Text>
                <Text style={styles.balanceLabel}>Manutenção</Text>
                <Text style={[styles.balanceValue, { color: "#FF9500" }]}>
                  {fmt(caixinha.saldoManutencao)}
                </Text>
                <Text style={styles.balancePercent}>5% por dia</Text>
              </View>
              <View style={[styles.balanceCard, { borderColor: "#0A84FF" }]}>
                <Text style={styles.balanceIcon}>🛡️</Text>
                <Text style={styles.balanceLabel}>Reserva</Text>
                <Text style={[styles.balanceValue, { color: "#0A84FF" }]}>
                  {fmt(caixinha.saldoReserva)}
                </Text>
                <Text style={styles.balancePercent}>5% por dia</Text>
              </View>
            </View>

            {/* Card total */}
            <View style={styles.totalCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>💰 Total Acumulado</Text>
                <Text style={styles.totalValue}>{fmt(caixinha.saldoTotal)}</Text>
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalSubLabel}>Dias com aporte</Text>
                <Text style={styles.totalSubValue}>{caixinha.entries.length}</Text>
              </View>
              {caixinha.entries.length > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalSubLabel}>Média por dia</Text>
                  <Text style={styles.totalSubValue}>
                    {fmt(caixinha.saldoTotal / caixinha.entries.length)}
                  </Text>
                </View>
              )}
            </View>

            {/* Explicação */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Como funciona?</Text>
              <Text style={styles.infoText}>
                Ao salvar um lançamento do dia, o app automaticamente separa{"\n"}
                • <Text style={{ color: "#FF9500" }}>5% para Manutenção</Text> — pneus, revisão, peças{"\n"}
                • <Text style={{ color: "#0A84FF" }}>5% para Reserva</Text> — emergências e imprevistos{"\n\n"}
                Esses valores são descontados do lucro líquido exibido no Dashboard.
              </Text>
            </View>

            {sortedEntries.length > 0 && (
              <Text style={styles.historyTitle}>Histórico de Aportes</Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🪙</Text>
            <Text style={styles.emptyTitle}>Nenhum aporte ainda</Text>
            <Text style={styles.emptySubtitle}>
              Faça um lançamento na aba Lançamentos para começar a acumular na Caixinha.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.entryCard}>
            <View style={styles.entryLeft}>
              <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
              <Text style={styles.entryBase}>Ganho bruto: {fmt(item.ganhoBase)}</Text>
              <View style={styles.entryBreakdown}>
                <Text style={styles.entryManutencao}>🔧 {fmt(item.manutencao)}</Text>
                <Text style={styles.entryReserva}>🛡️ {fmt(item.reserva)}</Text>
              </View>
            </View>
            <View style={styles.entryRight}>
              <Text style={styles.entryTotal}>{fmt(item.total)}</Text>
              <Text style={styles.entryTotalLabel}>10% bruto</Text>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteBtnText}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "700", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { color: "#8E8E93", fontSize: 15, lineHeight: 22, marginBottom: 24 },
  balanceRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  balanceCard: {
    flex: 1, backgroundColor: "#111111", borderRadius: 16, padding: 16,
    borderWidth: 1.5, alignItems: "center",
  },
  balanceIcon: { fontSize: 28, marginBottom: 8 },
  balanceLabel: { color: "#8E8E93", fontSize: 13, fontWeight: "500", marginBottom: 6 },
  balanceValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5, marginBottom: 4 },
  balancePercent: { color: "#555555", fontSize: 12 },
  totalCard: {
    backgroundColor: "#111111", borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: "#1C1C1E",
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  totalDivider: { height: 1, backgroundColor: "#1C1C1E", marginVertical: 8 },
  totalLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  totalValue: { color: "#00D4AA", fontSize: 20, fontWeight: "800" },
  totalSubLabel: { color: "#8E8E93", fontSize: 14 },
  totalSubValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  infoCard: {
    backgroundColor: "rgba(10, 132, 255, 0.08)", borderRadius: 16, padding: 16,
    marginBottom: 28, borderWidth: 1, borderColor: "rgba(10, 132, 255, 0.2)",
  },
  infoTitle: { color: "#0A84FF", fontSize: 15, fontWeight: "700", marginBottom: 8 },
  infoText: { color: "#8E8E93", fontSize: 14, lineHeight: 22 },
  historyTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  entryCard: {
    backgroundColor: "#111111", borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: "#1C1C1E",
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  entryLeft: { flex: 1 },
  entryDate: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginBottom: 4 },
  entryBase: { color: "#8E8E93", fontSize: 13, marginBottom: 8 },
  entryBreakdown: { flexDirection: "row", gap: 12 },
  entryManutencao: { color: "#FF9500", fontSize: 13, fontWeight: "600" },
  entryReserva: { color: "#0A84FF", fontSize: 13, fontWeight: "600" },
  entryRight: { alignItems: "flex-end" },
  entryTotal: { color: "#00D4AA", fontSize: 20, fontWeight: "800" },
  entryTotalLabel: { color: "#555555", fontSize: 12, marginBottom: 8 },
  deleteBtn: {
    backgroundColor: "rgba(255, 69, 58, 0.1)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(255, 69, 58, 0.3)",
  },
  deleteBtnText: { color: "#FF453A", fontSize: 12, fontWeight: "600" },
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySubtitle: { color: "#8E8E93", fontSize: 15, lineHeight: 22, textAlign: "center" },
});
