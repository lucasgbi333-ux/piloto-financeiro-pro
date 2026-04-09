import { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import type { ReportItem } from "@/lib/types";

interface AnimatedBarChartProps {
  data: ReportItem[];
  height?: number;
}

function AnimatedBar({
  item,
  maxValue,
  barHeight,
  index,
}: {
  item: ReportItem;
  maxValue: number;
  barHeight: number;
  index: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Stagger animation: each bar starts slightly after the previous
    const timeout = setTimeout(() => {
      progress.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    }, index * 100);
    return () => clearTimeout(timeout);
  }, []);

  const targetHeight = maxValue > 0 ? (item.totalProfit / maxValue) * barHeight : 0;
  const isPositive = item.totalProfit >= 0;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: Math.abs(targetHeight) * progress.value,
    };
  });

  return (
    <View style={styles.barContainer}>
      <Text style={styles.barValue}>
        {item.totalProfit >= 0 ? "+" : ""}
        {item.totalProfit.toFixed(0)}
      </Text>
      <View style={[styles.barWrapper, { height: barHeight }]}>
        <View style={styles.barAligner}>
          <Animated.View
            style={[
              styles.bar,
              {
                backgroundColor: isPositive ? "#30D158" : "#FF453A",
              },
              animatedStyle,
            ]}
          />
        </View>
      </View>
      <Text style={styles.barLabel} numberOfLines={1}>
        {item.period.length > 8 ? item.period.substring(0, 8) : item.period}
      </Text>
    </View>
  );
}

export function AnimatedBarChart({ data, height = 200 }: AnimatedBarChartProps) {
  const maxValue = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => Math.abs(d.totalProfit)), 1);
  }, [data]);

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>Nenhum dado disponível</Text>
        <Text style={styles.emptySubtext}>
          Salve dias de trabalho na aba Operacional
        </Text>
      </View>
    );
  }

  const barHeight = height - 60; // space for labels and values

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.barsRow}>
        {data.slice(0, 7).map((item, index) => (
          <AnimatedBar
            key={item.period}
            item={item}
            maxValue={maxValue}
            barHeight={barHeight}
            index={index}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1C1C1E",
  },
  barsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
    maxWidth: 50,
  },
  barValue: {
    color: "#8E8E93",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
  },
  barWrapper: {
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barAligner: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },
  bar: {
    width: "60%",
    borderRadius: 6,
    minHeight: 2,
  },
  barLabel: {
    color: "#8E8E93",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 6,
    textAlign: "center",
  },
  emptyContainer: {
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1C1C1E",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#8E8E93",
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    color: "#555555",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
});
