import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import Slider from "@react-native-community/slider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import {
  useRadarGanhos,
  SEMAFORO_COLORS,
  type SemaforoLimite,
} from "@/lib/radar-ganhos-context";
import * as Haptics from "expo-haptics";
import { PermissionBanner } from "@/components/permission-banner";
import {
  isAndroid,
  openOverlaySettings,
  openAccessibilitySettings,
  getOverlayPermissionGranted,
  getAccessibilityPermissionGranted,
  markOverlayPermissionGranted,
  markAccessibilityPermissionGranted,
} from "@/lib/overlay-permissions";
import RadarOverlay from "@/modules/radar-overlay";

// ─── Colors ───
const C = {
  bg: "#000000",
  card: "#111214",
  cardBorder: "#1C1C1E",
  orange: "#FF6B00",
  orangeLight: "#FF8C00",
  text: "#ECEDEE",
  textMuted: "#8E8E93",
  textDim: "#555555",
  switchTrackOn: "#FF6B00",
  switchTrackOff: "#333333",
  switchThumbOn: "#FFFFFF",
  switchThumbOff: "#888888",
  btnBg: "#1A1A1E",
  btnBorder: "#2A2A2E",
  checkActive: "#FF6B00",
  checkInactive: "#444444",
  verde: SEMAFORO_COLORS.verde,
  amarelo: SEMAFORO_COLORS.amarelo,
  vermelho: SEMAFORO_COLORS.vermelho,
};

// ─── Haptic helper ───
function haptic() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

// ─── Section Header ───
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ─── Custom Switch Row ───
function SwitchRow({
  icon,
  iconColor,
  label,
  value,
  onValueChange,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchRowLeft}>
        <MaterialIcons name={icon as any} size={22} color={iconColor || C.orange} />
        <Text style={styles.switchLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptic();
          onValueChange(v);
        }}
        trackColor={{ false: C.switchTrackOff, true: C.switchTrackOn }}
        thumbColor={value ? C.switchThumbOn : C.switchThumbOff}
        ios_backgroundColor={C.switchTrackOff}
      />
    </View>
  );
}

// ─── Semáforo Limit Adjuster ───
function LimitAdjuster({
  icon,
  iconColor,
  label,
  limite,
  step,
  decimals,
  prefix,
  onChangeRuim,
  onChangeBom,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  limite: SemaforoLimite;
  step: number;
  decimals: number;
  prefix?: string;
  onChangeRuim: (v: number) => void;
  onChangeBom: (v: number) => void;
}) {
  const [editedRuim, setEditedRuim] = useState(false);
  const [editedBom, setEditedBom] = useState(false);

  const handleDecrement = (current: number, setter: (v: number) => void, markEdited: () => void) => {
    haptic();
    const newVal = Math.max(0, parseFloat((current - step).toFixed(decimals)));
    setter(newVal);
    markEdited();
  };

  const handleIncrement = (current: number, setter: (v: number) => void, markEdited: () => void) => {
    haptic();
    const newVal = parseFloat((current + step).toFixed(decimals));
    setter(newVal);
    markEdited();
  };

  return (
    <View style={styles.limitCard}>
      <View style={styles.limitHeader}>
        <MaterialIcons name={icon as any} size={20} color={iconColor || C.orange} />
        <Text style={styles.limitLabel}>{label}</Text>
      </View>
      <View style={styles.limitRow}>
        <View style={styles.limitColumn}>
          <Text style={[styles.limitColumnLabel, { color: C.vermelho }]}>Ruim</Text>
          <View style={styles.adjusterRow}>
            <Pressable
              onPress={() => handleDecrement(limite.ruim, onChangeRuim, () => setEditedRuim(true))}
              style={({ pressed }) => [styles.adjusterBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.adjusterBtnText}>—</Text>
            </Pressable>
            <Text style={styles.adjusterValue}>
              {prefix}{limite.ruim.toFixed(decimals)}
            </Text>
            <Pressable
              onPress={() => handleIncrement(limite.ruim, onChangeRuim, () => setEditedRuim(true))}
              style={({ pressed }) => [styles.adjusterBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.adjusterBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.limitColumn}>
          <Text style={[styles.limitColumnLabel, { color: C.verde }]}>Bom</Text>
          <View style={styles.adjusterRow}>
            <Pressable
              onPress={() => handleDecrement(limite.bom, onChangeBom, () => setEditedBom(true))}
              style={({ pressed }) => [styles.adjusterBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.adjusterBtnText}>—</Text>
            </Pressable>
            <Text style={styles.adjusterValue}>
              {prefix}{limite.bom.toFixed(decimals)}
            </Text>
            <Pressable
              onPress={() => handleIncrement(limite.bom, onChangeBom, () => setEditedBom(true))}
              style={({ pressed }) => [styles.adjusterBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.adjusterBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.checkBtn, (editedRuim || editedBom) && styles.checkBtnActive]}>
          <MaterialIcons name="check" size={22} color={(editedRuim || editedBom) ? "#FFF" : "#666" } />
        </View>
      </View>
    </View>
  );
}

// ─── App Toggle Row ───
function AppToggleRow({
  name,
  subtitle,
  iconBg,
  iconText,
  value,
  onValueChange,
}: {
  name: string;
  subtitle: string;
  iconBg: string;
  iconText: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.appRow}>
      <View style={[styles.appIcon, { backgroundColor: iconBg }]}>
        <Text style={styles.appIconText}>{iconText}</Text>
      </View>
      <View style={styles.appInfo}>
        <Text style={styles.appName}>{name}</Text>
        <Text style={styles.appSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptic();
          onValueChange(v);
        }}
        trackColor={{ false: C.switchTrackOff, true: C.switchTrackOn }}
        thumbColor={value ? C.switchThumbOn : C.switchThumbOff}
        ios_backgroundColor={C.switchTrackOff}
      />
    </View>
  );
}

// ─── Slider Row ───
function SliderRow({
  icon,
  label,
  value,
  min,
  max,
  step,
  suffix,
  onValueChange,
}: {
  icon: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onValueChange: (v: number) => void;
}) {
  return (
    <View style={styles.sliderCard}>
      <View style={styles.sliderHeader}>
        <View style={styles.sliderHeaderLeft}>
          <MaterialIcons name={icon as any} size={20} color={C.orange} />
          <Text style={styles.sliderLabel}>{label}</Text>
        </View>
        <Text style={styles.sliderValue}>
          {Number.isInteger(value) ? value : value.toFixed(0)}{suffix}
        </Text>
      </View>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderMinMax}>{min}{suffix === "%" ? "%" : ""}</Text>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={value}
          onValueChange={onValueChange}
          minimumTrackTintColor={C.orange}
          maximumTrackTintColor="#333333"
          thumbTintColor={C.orange}
        />
        <Text style={styles.sliderMinMax}>{max}{suffix === "%" ? "%" : ""}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ───
export default function RadarGanhosScreen() {
  const {
    state,
    setSemaforoEnabled,
    setSemaforoLimite,
    setAppEnabled,
    setCapturaTelaEnabled,
    setOverlayToggle,
    setOverlaySlider,
  } = useRadarGanhos();

  // Estado de permissões (Android only)
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [accessibilityGranted, setAccessibilityGranted] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const nativeAvailable = RadarOverlay.isAvailable();

  // Carrega o estado de permissões
  useEffect(() => {
    if (!isAndroid) {
      setPermissionsLoaded(true);
      return;
    }
    // Se o módulo nativo está disponível, usa a API real
    if (nativeAvailable) {
      setOverlayGranted(RadarOverlay.canDrawOverlays());
      setAccessibilityGranted(RadarOverlay.isAccessibilityServiceRunning());
      setPermissionsLoaded(true);
    } else {
      // Fallback: usa AsyncStorage (Expo Go)
      Promise.all([
        getOverlayPermissionGranted(),
        getAccessibilityPermissionGranted(),
      ]).then(([overlay, accessibility]) => {
        setOverlayGranted(overlay);
        setAccessibilityGranted(accessibility);
        setPermissionsLoaded(true);
      });
    }
  }, []);

  // Sincroniza configurações com o módulo nativo quando mudam
  useEffect(() => {
    if (!nativeAvailable) return;
    RadarOverlay.syncAllSettings({
      semaforoEnabled: state.semaforoEnabled,
      limiteKmRuim: state.ganhosPorKm.ruim,
      limiteKmBom: state.ganhosPorKm.bom,
      limiteHoraRuim: state.ganhosPorHora.ruim,
      limiteHoraBom: state.ganhosPorHora.bom,
      limiteNotaRuim: state.notaPassageiro.ruim,
      limiteNotaBom: state.notaPassageiro.bom,
      appUber: state.uberEnabled,
      app99: state.app99Enabled,
      appIndriver: state.indriveEnabled,
      capturaTelaEnabled: state.capturaTelaEnabled,
      overlayFontSize: state.overlayFontSize,
      overlayTransparency: state.overlayTransparencia,
      overlayDuration: state.overlayDuracao,
      overlayShowKm: state.overlayGanhosPorKm,
      overlayShowHour: state.overlayGanhosPorHora,
      overlayShowMinute: state.overlayGanhosPorMinuto,
      overlayShowRating: state.overlayNotaPassageiro,
    });
  }, [state, nativeAvailable]);

  // Abre configurações de overlay
  async function handleGrantOverlay() {
    if (nativeAvailable) {
      RadarOverlay.requestOverlayPermission();
    } else {
      await openOverlaySettings();
    }
    Alert.alert(
      "Permissão concedida?",
      "Após ativar 'Exibir sobre outros apps' nas configurações, toque em 'Sim' para confirmar.",
      [
        { text: "Ainda não", style: "cancel" },
        {
          text: "Sim, concedi",
          onPress: async () => {
            if (nativeAvailable) {
              setOverlayGranted(RadarOverlay.canDrawOverlays());
            } else {
              await markOverlayPermissionGranted(true);
              setOverlayGranted(true);
            }
          },
        },
      ]
    );
  }

  // Abre configurações de acessibilidade
  async function handleGrantAccessibility() {
    if (nativeAvailable) {
      RadarOverlay.openAccessibilitySettings();
    } else {
      await openAccessibilitySettings();
    }
    Alert.alert(
      "Serviço ativado?",
      "Após ativar o Piloto Financeiro Pro em Serviços de Acessibilidade, toque em 'Sim' para confirmar.",
      [
        { text: "Ainda não", style: "cancel" },
        {
          text: "Sim, ativei",
          onPress: async () => {
            if (nativeAvailable) {
              setAccessibilityGranted(RadarOverlay.isAccessibilityServiceRunning());
            } else {
              await markAccessibilityPermissionGranted(true);
              setAccessibilityGranted(true);
            }
          },
        },
      ]
    );
  }

  // Função para testar o overlay
  function handleTestOverlay() {
    if (!nativeAvailable) {
      Alert.alert(
        "Dev Build necessário",
        "O teste do overlay só funciona no APK de desenvolvimento (Dev Build). No Expo Go, o módulo nativo não está disponível."
      );
      return;
    }
    const success = RadarOverlay.testOverlay({
      semaphoreColor: "green",
      fontSize: state.overlayFontSize,
      transparency: state.overlayTransparencia,
      duration: state.overlayDuracao,
      showKm: state.overlayGanhosPorKm,
      showHour: state.overlayGanhosPorHora,
      showMinute: state.overlayGanhosPorMinuto,
      showRating: state.overlayNotaPassageiro,
    });
    if (!success) {
      Alert.alert(
        "Permissão necessária",
        "Conceda a permissão 'Exibir sobre outros apps' para testar o overlay."
      );
    }
  }

  // Determina se deve exibir os banners de permissão
  const showOverlayBanner = isAndroid && permissionsLoaded && !overlayGranted;
  const showAccessibilityBanner = isAndroid && permissionsLoaded && !accessibilityGranted;

  return (
    <ScreenContainer containerClassName="bg-black" className="bg-black">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="radar" size={28} color={C.orange} />
          <Text style={styles.headerTitle}>Radar de Ganhos</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Central de configurações do overlay para apps de corrida
        </Text>

        {/* ═══ BANNERS DE PERMISSÃO (Android only) ═══ */}
        {showOverlayBanner && (
          <PermissionBanner
            variant="warning"
            icon="layers"
            title="Permissão de sobreposição necessária"
            description="Para exibir o pop-up sobre os apps de corrida (Uber, 99, InDrive), o app precisa da permissão 'Exibir sobre outros apps' do Android."
            actionLabel="Abrir configurações"
            onAction={handleGrantOverlay}
            secondaryLabel="Já concedi"
            onSecondary={async () => {
              await markOverlayPermissionGranted(true);
              setOverlayGranted(true);
            }}
          />
        )}

        {showAccessibilityBanner && (
          <PermissionBanner
            variant="warning"
            icon="accessibility"
            title="Serviço de Acessibilidade necessário"
            description="Para capturar automaticamente os dados das ofertas de corrida (valor, distância, nota), o app precisa estar ativo em Serviços de Acessibilidade do Android."
            actionLabel="Ativar acessibilidade"
            onAction={handleGrantAccessibility}
            secondaryLabel="Já ativei"
            onSecondary={async () => {
              await markAccessibilityPermissionGranted(true);
              setAccessibilityGranted(true);
            }}
          />
        )}

        {/* Status de permissões quando ambas estão concedidas */}
        {isAndroid && permissionsLoaded && overlayGranted && accessibilityGranted && (
          <View style={styles.permissionOk}>
            <MaterialIcons name="check-circle" size={18} color="#22C55E" />
            <Text style={styles.permissionOkText}>Permissões configuradas — Overlay ativo</Text>
          </View>
        )}

        {/* ═══ SEÇÃO 1: Semáforo de Valores ═══ */}
        <SectionHeader
          title="Semáforo de Valores"
          subtitle="Utiliza cores e ícones para simplificar sua decisão sobre quais corridas aceitar ou recusar."
        />

        <View style={styles.card}>
          <SwitchRow
            icon="traffic"
            iconColor={C.orange}
            label="Habilitar Semáforo de Valores"
            value={state.semaforoEnabled}
            onValueChange={setSemaforoEnabled}
          />
        </View>

        {/* Legenda do semáforo */}
        {state.semaforoEnabled && (
          <View style={styles.semaforoLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.verde }]} />
              <Text style={styles.legendText}>Bom — Aceitar</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.amarelo }]} />
              <Text style={styles.legendText}>Atenção</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.vermelho }]} />
              <Text style={styles.legendText}>Ruim — Recusar</Text>
            </View>
          </View>
        )}

        {state.semaforoEnabled && (
          <View style={styles.card}>
            <LimitAdjuster
              icon="attach-money"
              label="Ganhos por Km"
              limite={state.ganhosPorKm}
              step={0.10}
              decimals={2}
              prefix=""
              onChangeRuim={(v) => setSemaforoLimite("ganhosPorKm", "ruim", v)}
              onChangeBom={(v) => setSemaforoLimite("ganhosPorKm", "bom", v)}
            />

            <View style={styles.divider} />

            <LimitAdjuster
              icon="attach-money"
              label="Ganhos por Hora"
              limite={state.ganhosPorHora}
              step={5.0}
              decimals={2}
              prefix=""
              onChangeRuim={(v) => setSemaforoLimite("ganhosPorHora", "ruim", v)}
              onChangeBom={(v) => setSemaforoLimite("ganhosPorHora", "bom", v)}
            />

            <View style={styles.divider} />

            <LimitAdjuster
              icon="star"
              iconColor={C.orange}
              label="Nota do Passageiro"
              limite={state.notaPassageiro}
              step={0.05}
              decimals={2}
              prefix=""
              onChangeRuim={(v) => setSemaforoLimite("notaPassageiro", "ruim", v)}
              onChangeBom={(v) => setSemaforoLimite("notaPassageiro", "bom", v)}
            />
          </View>
        )}

        {/* ═══ SEÇÃO 2: Ativação e Apps ═══ */}
        <SectionHeader
          title="Aplicativos"
          subtitle="Escolha os apps onde deseja ativar o Radar de Ganhos."
        />

        <View style={styles.card}>
          <AppToggleRow
            name="Uber"
            subtitle="Brasil"
            iconBg="#000000"
            iconText="UBER"
            value={state.uberEnabled}
            onValueChange={(v) => setAppEnabled("uber", v)}
          />
          <View style={styles.divider} />
          <AppToggleRow
            name="99"
            subtitle="Brasil"
            iconBg="#FFD700"
            iconText="99"
            value={state.app99Enabled}
            onValueChange={(v) => setAppEnabled("99", v)}
          />
          <View style={styles.divider} />
          <AppToggleRow
            name="InDrive"
            subtitle="Brasil"
            iconBg="#2DB543"
            iconText="iD"
            value={state.indriveEnabled}
            onValueChange={(v) => setAppEnabled("indrive", v)}
          />
        </View>

        {/* Histórico de Chamadas */}
        <Pressable
          onPress={() => {
            haptic();
            router.push("/(tabs)/historico-chamadas" as any);
          }}
          style={({ pressed }) => [styles.historicoBtn, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.historicoBtnLeft}>
            <MaterialIcons name="history" size={22} color={C.orange} />
            <View>
              <Text style={styles.historicoBtnTitle}>Histórico de Chamadas</Text>
              <Text style={styles.historicoBtnSubtitle}>Registro das chamadas de corrida recebidas.</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={C.textDim} />
        </Pressable>

        {/* ═══ SEÇÃO 3: Ferramentas e Automação ═══ */}
        <SectionHeader
          title="Captura de Tela da Chamada de Corrida"
          subtitle="Salvar uma captura de tela de cada chamada de corrida recebida."
        />

        <View style={styles.card}>
          <SwitchRow
            icon="screenshot"
            iconColor={C.orange}
            label="Ativar Captura de Tela"
            value={state.capturaTelaEnabled}
            onValueChange={setCapturaTelaEnabled}
          />
        </View>

        {/* ═══ SEÇÃO 4: Customização do Pop-up (Overlay) ═══ */}
        <SectionHeader
          title="Aparência"
          subtitle="Ajuste a aparência e controle quais campos serão mostrados no card de sobreposição do Cálculo de Ganhos."
        />

        <View style={styles.card}>
          <SwitchRow
            icon="attach-money"
            label="Ganhos por Km"
            value={state.overlayGanhosPorKm}
            onValueChange={(v) => setOverlayToggle("overlayGanhosPorKm", v)}
          />
          <View style={styles.divider} />
          <SwitchRow
            icon="attach-money"
            label="Ganhos por Hora"
            value={state.overlayGanhosPorHora}
            onValueChange={(v) => setOverlayToggle("overlayGanhosPorHora", v)}
          />
          <View style={styles.divider} />
          <SwitchRow
            icon="attach-money"
            label="Ganhos por Minuto"
            value={state.overlayGanhosPorMinuto}
            onValueChange={(v) => setOverlayToggle("overlayGanhosPorMinuto", v)}
          />
          <View style={styles.divider} />
          <SwitchRow
            icon="star"
            label="Nota do passageiro"
            value={state.overlayNotaPassageiro}
            onValueChange={(v) => setOverlayToggle("overlayNotaPassageiro", v)}
          />
        </View>

        {/* Sliders */}
        <View style={styles.card}>
          <SliderRow
            icon="format-size"
            label="Tamanho da fonte"
            value={state.overlayFontSize}
            min={12}
            max={18}
            step={1}
            suffix=""
            onValueChange={(v) => setOverlaySlider("overlayFontSize", Math.round(v))}
          />

          <View style={styles.divider} />

          <SliderRow
            icon="opacity"
            label="Transparência do cartão"
            value={state.overlayTransparencia}
            min={30}
            max={100}
            step={1}
            suffix="%"
            onValueChange={(v) => setOverlaySlider("overlayTransparencia", Math.round(v))}
          />

          <View style={styles.divider} />

          <SliderRow
            icon="timer"
            label="Duração do cartão"
            value={state.overlayDuracao}
            min={3}
            max={10}
            step={1}
            suffix=" segs"
            onValueChange={(v) => setOverlaySlider("overlayDuracao", Math.round(v))}
          />
        </View>

        {/* Botão de Teste do Overlay */}
        {isAndroid && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              handleTestOverlay();
            }}
            style={({ pressed }) => [
              styles.testButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <MaterialIcons name="play-circle-outline" size={22} color="#000" />
            <Text style={styles.testButtonText}>Testar Overlay</Text>
          </Pressable>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  headerTitle: {
    color: C.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 20,
    lineHeight: 18,
  },

  // Section
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    lineHeight: 17,
  },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    paddingVertical: 4,
    marginBottom: 8,
  },

  // Switch Row
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  switchRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  switchLabel: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
  },

  // Semáforo Legend
  semaforoLegend: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  // Limit Adjuster
  limitCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  limitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  limitLabel: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
  },
  limitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  limitColumn: {
    flex: 1,
  },
  limitColumnLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  adjusterRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.btnBg,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: C.btnBorder,
    overflow: "hidden",
  },
  adjusterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  adjusterBtnText: {
    color: C.textMuted,
    fontSize: 16,
    fontWeight: "700",
  },
  adjusterValue: {
    flex: 1,
    textAlign: "center",
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
  },
  checkBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.checkInactive,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    marginBottom: 0,
  },
  checkBtnActive: {
    backgroundColor: C.checkActive,
  },

  // Divider
  divider: {
    height: 0.5,
    backgroundColor: C.cardBorder,
    marginHorizontal: 16,
  },

  // App Row
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  appIconText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
  },
  appSubtitle: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },

  // Histórico Button
  historicoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  historicoBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  historicoBtnTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
  },
  historicoBtnSubtitle: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },

  // Slider
  sliderCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sliderHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sliderLabel: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
  },
  sliderValue: {
    color: C.orange,
    fontSize: 15,
    fontWeight: "700",
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderMinMax: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
    minWidth: 28,
    textAlign: "center",
  },

  // Permission OK status
  permissionOk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0A1F0A",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#22C55E44",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  permissionOkText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "600",
  },

  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.orange,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  testButtonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
});
