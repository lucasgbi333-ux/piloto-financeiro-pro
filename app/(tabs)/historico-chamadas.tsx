import { View, Text, FlatList, Pressable, StyleSheet, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import {
  useRadarGanhos,
  SEMAFORO_COLORS,
  type ChamadaRecord,
} from "@/lib/radar-ganhos-context";
import * as Haptics from "expo-haptics";

const C = {
  bg: "#000000",
  card: "#111214",
  cardBorder: "#1C1C1E",
  orange: "#FF6B00",
  text: "#ECEDEE",
  textMuted: "#8E8E93",
  textDim: "#555555",
};

function haptic() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

const APP_COLORS: Record<string, { bg: string; text: string }> = {
  uber: { bg: "#000000", text: "UBER" },
  "99": { bg: "#FFD700", text: "99" },
  indrive: { bg: "#2DB543", text: "iD" },
};

function formatDate(ts: number) {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${day}/${month} ${hours}:${mins}`;
}

function ChamadaItem({ item }: { item: ChamadaRecord }) {
  const appStyle = APP_COLORS[item.app] || APP_COLORS.uber;
  const semaforColor = SEMAFORO_COLORS[item.corSemaforo];

  return (
    <View style={styles.chamadaCard}>
      <View style={styles.chamadaHeader}>
        <View style={[styles.appBadge, { backgroundColor: appStyle.bg }]}>
          <Text style={styles.appBadgeText}>{appStyle.text}</Text>
        </View>
        <Text style={styles.chamadaDate}>{formatDate(item.timestamp)}</Text>
        <View style={[styles.semaforoDot, { backgroundColor: semaforColor }]} />
      </View>

      <View style={styles.chamadaMetrics}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Valor</Text>
          <Text style={styles.metricValue}>R$ {item.valor.toFixed(2)}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Distância</Text>
          <Text style={styles.metricValue}>{item.distanciaKm.toFixed(1)} km</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Tempo</Text>
          <Text style={styles.metricValue}>{item.tempoMin} min</Text>
        </View>
      </View>

      <View style={styles.chamadaMetrics}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>R$/Km</Text>
          <Text style={[styles.metricValue, { color: semaforColor }]}>
            {item.ganhoPorKm.toFixed(2)}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>R$/Hora</Text>
          <Text style={[styles.metricValue, { color: semaforColor }]}>
            {item.ganhoPorHora.toFixed(2)}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Nota</Text>
          <Text style={styles.metricValue}>{item.notaPassageiro.toFixed(1)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HistoricoChamadasScreen() {
  const { state, clearHistorico } = useRadarGanhos();

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="history" size={56} color={C.textDim} />
      <Text style={styles.emptyTitle}>Nenhuma chamada registrada</Text>
      <Text style={styles.emptySubtitle}>
        As chamadas de corrida serão registradas aqui quando o Radar estiver ativo.
      </Text>
    </View>
  );

  return (
    <ScreenContainer containerClassName="bg-black" className="bg-black">
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            haptic();
            router.back();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Histórico de Chamadas</Text>
        {state.historicoChamadas.length > 0 && (
          <Pressable
            onPress={() => {
              haptic();
              clearHistorico();
            }}
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="delete-outline" size={22} color={C.orange} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={state.historicoChamadas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChamadaItem item={item} />}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  clearBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },

  // Chamada Card
  chamadaCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    padding: 16,
    marginBottom: 10,
  },
  chamadaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  appBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  appBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  chamadaDate: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  semaforoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Metrics
  chamadaMetrics: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metricValue: {
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 19,
  },
});
