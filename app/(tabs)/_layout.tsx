import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00D4AA",
        tabBarInactiveTintColor: "#555555",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "#0A0A0A",
          borderTopColor: "#1C1C1E",
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="square.grid.2x2.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fixed-costs"
        options={{
          title: "Fixos",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="creditcard.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lancamentos"
        options={{
          title: "Lançamentos",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="calendar.badge.plus" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="chart.line.uptrend.xyaxis" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="caixinha"
        options={{
          title: "Caixinha",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="banknote.fill" color={color} />
          ),
        }}
      />

      {/* Telas ocultas da tab bar */}
      <Tabs.Screen name="vehicle-profiles" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="operational" options={{ href: null }} />
    </Tabs>
  );
}
