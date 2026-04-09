import {
  Text, View, StyleSheet, TouchableOpacity, FlatList, Alert, Platform, TextInput,
} from "react-native";
import { useState } from "react";
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

function parsePct(val: string): number {
  const n = parseFloat(val.replace(",", "."));
  if (isNaN(n) || n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export default function CaixinhaScreen() {
  const { state, deleteCaixinhaEntry, setCaixinhaConfig } = useApp();
  const { caixinha } = state;

  const [editingConfig, setEditingConfig] = useState(false);
  const [pctManut, setPctManut] = useState(String(caixinha.config.percentualManutencao));
  const [pctReserva, setPctReserva] = useState(String(caixinha.config.percentualReserva));

  const handleSaveConfig = () => {
    const m = parsePct(pctManut);
    const r = parsePct(pctReserva);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCaixinhaConfig({ percentualManutencao: m, percentualReserva: r });
    setPctManut(String(m));
    setPctReserva(String(r));
    setEditingConfig(false);
  };

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
  const totalPct = caixinha.config.percentualManutencao + caixinha.config.percentualReserva;

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
              Percentuais configuráveis do ganho bruto separados automaticamente a cada lançamento.
            </Text>

            {/* Configuração de percentuais */}
            <View style={styles.configCard}>
              <View style={styles.configHeader}>
                <Text style={styles.configTitle}>⚙️ Configurar Percentuais</Text>
                <TouchableOpacity
                  style={[styles.configEditBtn, editingConfig && styles.configEditBtnActive]}
                  onPress={() => {
                    if (editingConfig) {
                      handleSaveConfig();
                    } else {
                      setPctManut(String(caixinha.config.percentualManutencao));
                      setPctReserva(String(caixinha.config.percentualReserva));
                      setEditingConfig(true);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.configEditBtnText, editingConfig && styles.configEditBtnTextActive]}>
                    {editingConfig ? "Salvar" : "Editar"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.configRow}>
                <View style={styles.configItem}>
                  <Text style={styles.configItemIcon}>🔧</Text>
                  <Text style={styles.configItemLabel}>Manutenção</Text>
                  {editingConfig ? (
                    <View style={styles.configInputRow}>
                      <TextInput
                        style={styles.configInput}
                        value={pctManut}
                        onChangeText={setPctManut}
                        keyboardType="decimal-pad"
                        maxLength={5}
                        selectTextOnFocus
                      />
                      <Text style={styles.configPctSymbol}>%</Text>
                    </View>
                  ) : (
                    <Text style={[styles.configItemValue, { color: "#FF9500" }]}>
                      {caixinha.config.percentualManutencao}%
                    </Text>
                  )}
                </View>

                <View style={styles.configDivider} />

                <View style={styles.configItem}>
                  <Text style={styles.configItemIcon}>🛡️</Text>
                  <Text style={styles.configItemLabel}>Reserva</Text>
                  {editingConfig ? (
                    <View style={styles.configInputRow}>
                      <TextInput
                        style={styles.configInput}
                        value={pctReserva}
                        onChangeText={setPctReserva}
                        keyboardType="decimal-pad"
                        maxLength={5}
                        selectTextOnFocus
                      />
                      <Text style={styles.configPctSymbol}>%</Text>
                    </View>
                  ) : (
                    <Text style={[styles.configItemValue, { color: "#0A84FF" }]}>
                      {caixinha.config.percentualReserva}%
                    </Text>
                  )}
                </View>
              </View>

              {editingConfig && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditingConfig(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.configNote}>
                Total separado por dia: <Text style={{ color: "#00D4AA", fontWeight: "700" }}>{totalPct}%</Text> do ganho bruto
              </Text>
            </View>

            {/* Cards de saldo */}
            <View style={styles.balanceRow}>
              <View style={[styles.balanceCard, { borderColor: "#FF9500" }]}>
                <Text style={styles.balanceIcon}>🔧</Text>
                <Text style={styles.balanceLabel}>Manutenção</Text>
                <Text style={[styles.balanceValue, { color: "#FF9500" }]}>
                  {fmt(caixinha.saldoManutencao)}
                </Text>
                <Text style={styles.balancePercent}>{caixinha.config.percentualManutencao}% por dia</Text>
              </View>
              <View style={[styles.balanceCard, { borderColor: "#0A84FF" }]}>
                <Text style={styles.balanceIcon}>🛡️</Text>
                <Text style={styles.balanceLabel}>Reserva</Text>
                <Text style={[styles.balanceValue, { color: "#0A84FF" }]}>
                  {fmt(caixinha.saldoReserva)}
                </Text>
                <Text style={styles.balancePercent}>{caixinha.config.percentualReserva}% por dia</Text>
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
                • <Text style={{ color: "#FF9500" }}>{caixinha.config.percentualManutencao}% para Manutenção</Text> — pneus, revisão, peças{"\n"}
                • <Text style={{ color: "#0A84FF" }}>{caixinha.config.percentualReserva}% para Reserva</Text> — emergências e imprevistos{"\n\n"}
                Esses valores são descontados do lucro líquido exibido no Dashboard.{"\n"}
                Você pode ajustar os percentuais a qualquer momento acima.
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
                <Text style={styles.entryManutencao}>
                  🔧 {fmt(item.manutencao)} ({item.percentualManutencao ?? 5}%)
                </Text>
                <Text style={styles.entryReserva}>
                  🛡️ {fmt(item.reserva)} ({item.percentualReserva ?? 5}%)
                </Text>
              </View>
            </View>
            <View style={styles.entryRight}>
              <Text style={styles.entryTotal}>{fmt(item.total)}</Text>
              <Text style={styles.entryTotalLabel}>
                {(item.percentualManutencao ?? 5) + (item.percentualReserva ?? 5)}% bruto
              </Text>
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

  // Configuração
  configCard: {
    backgroundColor: "#111111", borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: "#2C2C2E",
  },
  configHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  configTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  configEditBtn: {
    backgroundColor: "rgba(0, 212, 170, 0.1)", borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(0, 212, 170, 0.3)",
  },
  configEditBtnActive: {
    backgroundColor: "rgba(0, 212, 170, 0.2)",
    borderColor: "#00D4AA",
  },
  configEditBtnText: { color: "#00D4AA", fontSize: 14, fontWeight: "600" },
  configEditBtnTextActive: { color: "#00D4AA" },
  configRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  configItem: { flex: 1, alignItems: "center", gap: 6 },
  configItemIcon: { fontSize: 24 },
  configItemLabel: { color: "#8E8E93", fontSize: 13, fontWeight: "500" },
  configItemValue: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  configInputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  configInput: {
    backgroundColor: "#1C1C1E", color: "#FFFFFF", fontSize: 24, fontWeight: "700",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "#3A3A3C", minWidth: 60, textAlign: "center",
  },
  configPctSymbol: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  configDivider: { width: 1, backgroundColor: "#2C2C2E", alignSelf: "stretch" },
  configNote: { color: "#8E8E93", fontSize: 13, textAlign: "center", marginTop: 4 },
  cancelBtn: {
    backgroundColor: "rgba(255, 69, 58, 0.1)", borderRadius: 8,
    paddingVertical: 8, alignItems: "center", marginBottom: 8,
    borderWidth: 1, borderColor: "rgba(255, 69, 58, 0.3)",
  },
  cancelBtnText: { color: "#FF453A", fontSize: 14, fontWeight: "600" },

  // Saldos
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
  entryBreakdown: { gap: 4 },
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
