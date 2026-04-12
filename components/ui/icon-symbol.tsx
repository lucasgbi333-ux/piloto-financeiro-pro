import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Navegação principal
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  // Tabs modernas
  "doc.text.fill": "receipt-long",
  "car.fill": "directions-car",
  "chart.bar.fill": "insights",
  "person.fill": "person",
  "list.bullet": "format-list-bulleted",
  "creditcard.fill": "account-balance-wallet",
  "calendar.badge.plus": "add-circle",
  "clock.fill": "history",
  "chart.line.uptrend.xyaxis": "trending-up",
  "bolt.fill": "flash-on",
  "fuelpump.fill": "local-gas-station",
  "speedometer": "speed",
  "wallet.pass.fill": "payments",
  "square.grid.2x2.fill": "dashboard",
  "calendar": "calendar-today",
  "clock.arrow.circlepath": "history",
  "gauge.badge.plus": "add-road",
  "car.circle.fill": "commute",
  "steeringwheel": "drive-eta",
  "banknote.fill": "savings",
  "antenna.radiowaves.left.and.right": "radar",
  "gearshape.fill": "settings",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
