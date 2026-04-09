/**
 * RadarOverlay — Módulo nativo para overlay sobre apps de corrida
 *
 * Este módulo usa AccessibilityService + WindowManager no Android para:
 * 1. Capturar dados de ofertas de corrida (Uber, 99, InDrive)
 * 2. Exibir overlay com semáforo de cores sobre os apps
 *
 * Uso:
 * ```ts
 * import RadarOverlay from '@/modules/radar-overlay';
 *
 * // Verificar permissões
 * const hasOverlay = RadarOverlay.canDrawOverlays();
 * const hasAccessibility = RadarOverlay.isAccessibilityServiceRunning();
 *
 * // Solicitar permissões
 * RadarOverlay.requestOverlayPermission();
 * RadarOverlay.openAccessibilitySettings();
 *
 * // Sincronizar configurações
 * RadarOverlay.syncAllSettings({ ... });
 *
 * // Testar overlay
 * RadarOverlay.testOverlay({ semaphoreColor: 'green', fontSize: 15, ... });
 * ```
 */

import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

// Tipos
export interface RideOfferEvent {
  app: string;
  value: number;
  distanceKm: number;
  estimatedMinutes: number;
  passengerRating: number;
  earningsPerKm: number;
  earningsPerHour: number;
  earningsPerMinute: number;
  semaphoreColor: "green" | "yellow" | "red";
  timestamp: number;
}

export interface RadarSettings {
  semaforoEnabled?: boolean;
  limiteKmRuim?: number;
  limiteKmBom?: number;
  limiteHoraRuim?: number;
  limiteHoraBom?: number;
  limiteNotaRuim?: number;
  limiteNotaBom?: number;
  appUber?: boolean;
  app99?: boolean;
  appIndriver?: boolean;
  capturaTelaEnabled?: boolean;
  overlayFontSize?: number;
  overlayTransparency?: number;
  overlayDuration?: number;
  overlayShowKm?: boolean;
  overlayShowHour?: boolean;
  overlayShowMinute?: boolean;
  overlayShowRating?: boolean;
}

export interface OverlayVisualConfig {
  fontSize?: number;
  transparency?: number;
  duration?: number;
  showKm?: boolean;
  showHour?: boolean;
  showMinute?: boolean;
  showRating?: boolean;
}

export interface TestOverlayConfig extends OverlayVisualConfig {
  semaphoreColor?: "green" | "yellow" | "red";
}

// Interface do módulo nativo
interface RadarOverlayNativeModule {
  canDrawOverlays(): boolean;
  requestOverlayPermission(): void;
  openAccessibilitySettings(): void;
  isAccessibilityServiceRunning(): boolean;
  updateSettings(settings: Record<string, any>): void;
  updateOverlayVisuals(config: Record<string, any>): void;
  syncAllSettings(config: Record<string, any>): void;
  testOverlay(config: Record<string, any>): boolean;
}

// Carrega o módulo nativo (apenas no Android)
let nativeModule: RadarOverlayNativeModule | null = null;

if (Platform.OS === "android") {
  try {
    nativeModule = requireNativeModule("RadarOverlay");
  } catch (e) {
    console.warn(
      "RadarOverlay: Módulo nativo não disponível. " +
        "Necessário Expo Dev Build (não funciona no Expo Go)."
    );
  }
}

/**
 * API pública do módulo RadarOverlay.
 * No iOS e Web, todas as funções retornam valores padrão (não-operacional).
 */
const RadarOverlay = {
  /**
   * Verifica se a permissão de overlay (SYSTEM_ALERT_WINDOW) está concedida.
   * Retorna false no iOS/Web.
   */
  canDrawOverlays(): boolean {
    if (!nativeModule) return false;
    return nativeModule.canDrawOverlays();
  },

  /**
   * Abre as configurações de permissão de overlay do Android.
   * Não faz nada no iOS/Web.
   */
  requestOverlayPermission(): void {
    nativeModule?.requestOverlayPermission();
  },

  /**
   * Abre as configurações de Acessibilidade do Android.
   * Não faz nada no iOS/Web.
   */
  openAccessibilitySettings(): void {
    nativeModule?.openAccessibilitySettings();
  },

  /**
   * Verifica se o AccessibilityService está ativo.
   * Retorna false no iOS/Web.
   */
  isAccessibilityServiceRunning(): boolean {
    if (!nativeModule) return false;
    return nativeModule.isAccessibilityServiceRunning();
  },

  /**
   * Atualiza configurações individuais do semáforo.
   */
  updateSettings(settings: Record<string, any>): void {
    nativeModule?.updateSettings(settings);
  },

  /**
   * Atualiza configurações visuais do overlay.
   */
  updateOverlayVisuals(config: OverlayVisualConfig): void {
    nativeModule?.updateOverlayVisuals(config as Record<string, any>);
  },

  /**
   * Sincroniza todas as configurações do JS para o módulo nativo.
   * Deve ser chamado quando o app inicia e quando configurações mudam.
   */
  syncAllSettings(config: RadarSettings): void {
    nativeModule?.syncAllSettings(config as Record<string, any>);
  },

  /**
   * Testa o overlay com dados fictícios.
   * Retorna true se o overlay foi exibido, false se a permissão não está concedida.
   */
  testOverlay(config: TestOverlayConfig = {}): boolean {
    if (!nativeModule) return false;
    return nativeModule.testOverlay(config as Record<string, any>);
  },

  /**
   * Verifica se o módulo nativo está disponível.
   * Retorna false no Expo Go, iOS e Web.
   */
  isAvailable(): boolean {
    return nativeModule !== null;
  },
};

export default RadarOverlay;
