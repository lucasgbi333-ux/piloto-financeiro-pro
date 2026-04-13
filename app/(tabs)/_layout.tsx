import { useEffect } from "react";
import { Tabs } from "expo-router";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, ActivityIndicator, View, Text } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSupabaseAuth } from "@/lib/supabase-auth-provider";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const { session, loading, subscription, subscriptionLoading, trial, trialLoading } = useSupabaseAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session]);

  // Redirect to login/paywall if not subscribed and no trial
  useEffect(() => {
    if (!loading && session && !subscriptionLoading && !trialLoading) {
      const hasAccess = subscription.ativo || trial.is_active;
      if (!hasAccess) {
        router.replace("/login");
      }
    }
  }, [loading, session, subscriptionLoading, subscription.ativo, trialLoading, trial.is_active]);

  if (loading || subscriptionLoading || trialLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A0A0A" }}>
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={{ color: "#8E8E93", fontSize: 14, marginTop: 12 }}>Verificando acesso...</Text>
      </View>
    );
  }

  const hasAccess = subscription.ativo || trial.is_active;
  if (!session || !hasAccess) {
    return null;
  }

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

      <Tabs.Screen
        name="settings"
        options={{
          title: "Configurações",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="gearshape.fill" color={color} />
          ),
        }}
      />

      {/* Telas ocultas da tab bar */}
      <Tabs.Screen name="historico-chamadas" options={{ href: null }} />
      <Tabs.Screen name="vehicle-profiles" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="operational" options={{ href: null }} />
    </Tabs>
  );
}
