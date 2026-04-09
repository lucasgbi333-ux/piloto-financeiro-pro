/**
 * overlay-permissions.ts
 *
 * Módulo para verificar e solicitar permissões de overlay (SYSTEM_ALERT_WINDOW)
 * e Accessibility Service no Android.
 *
 * LIMITAÇÕES TÉCNICAS IMPORTANTES:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. SYSTEM_ALERT_WINDOW (Draw over other apps):
 *    - No Expo Managed Workflow, NÃO é possível verificar programaticamente
 *      se a permissão foi concedida via JavaScript (requer módulo nativo Kotlin).
 *    - O que SIM é possível: abrir a tela de configurações correta via Linking
 *      para que o usuário conceda a permissão manualmente.
 *    - A permissão SYSTEM_ALERT_WINDOW precisa ser declarada no AndroidManifest.xml
 *      via expo-build-properties ou plugin customizado.
 *
 * 2. Accessibility Service:
 *    - Verificar se um AccessibilityService específico está ativo requer módulo
 *      nativo (Settings.Secure.getString). Não é acessível via JS puro.
 *    - AccessibilityInfo.isAccessibilityManagerEnabled() verifica se QUALQUER
 *      serviço de acessibilidade está ativo (TalkBack, etc.), não o nosso.
 *    - Para implementação real do overlay sobre apps de corrida, é necessário
 *      um Expo Dev Build (bare workflow) com módulo Kotlin customizado.
 *
 * 3. iOS:
 *    - iOS NÃO permite overlays sobre outros apps. Esta funcionalidade é
 *      exclusiva do Android.
 *
 * O que este módulo faz:
 * - Detecta se está no Android
 * - Fornece funções para abrir as configurações corretas do Android
 * - Mantém estado local de "permissão concedida pelo usuário" via AsyncStorage
 *   (o usuário confirma manualmente após conceder a permissão nas configurações)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_OVERLAY = "@radar_overlay_permission_granted";
const STORAGE_KEY_ACCESSIBILITY = "@radar_accessibility_permission_granted";

export const isAndroid = Platform.OS === "android";
export const isIOS = Platform.OS === "ios";

/**
 * Abre as configurações de "Exibir sobre outros apps" (SYSTEM_ALERT_WINDOW)
 * no Android. O usuário precisa conceder a permissão manualmente.
 */
export async function openOverlaySettings(): Promise<void> {
  if (!isAndroid) return;

  // Intent para abrir a tela de permissão de overlay do Android
  // ACTION_MANAGE_OVERLAY_PERMISSION abre a tela específica do app
  const packageName = "space.manus.piloto.financeiro.pro"; // bundle ID do app
  const url = `intent://settings/action/ACTION_MANAGE_OVERLAY_PERMISSION#Intent;scheme=android-settings;end`;

  try {
    // Tenta abrir via intent específico do app
    const canOpen = await Linking.canOpenURL(
      `android.settings.action.MANAGE_OVERLAY_PERMISSION`
    );
    if (canOpen) {
      await Linking.openURL(
        `android.settings.action.MANAGE_OVERLAY_PERMISSION`
      );
    } else {
      // Fallback: abre as configurações gerais do app
      await Linking.openSettings();
    }
  } catch {
    // Último fallback: configurações gerais
    await Linking.openSettings();
  }
}

/**
 * Abre as configurações de Acessibilidade do Android para que o usuário
 * possa ativar o serviço de acessibilidade do app.
 */
export async function openAccessibilitySettings(): Promise<void> {
  if (!isAndroid) return;

  try {
    const canOpen = await Linking.canOpenURL(
      `android.settings.ACCESSIBILITY_SETTINGS`
    );
    if (canOpen) {
      await Linking.openURL(`android.settings.ACCESSIBILITY_SETTINGS`);
    } else {
      await Linking.openSettings();
    }
  } catch {
    await Linking.openSettings();
  }
}

/**
 * Abre as configurações gerais do app no Android/iOS.
 * Útil como fallback quando os intents específicos não funcionam.
 */
export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}

/**
 * Salva localmente que o usuário confirmou ter concedido a permissão de overlay.
 * (Não é possível verificar programaticamente sem módulo nativo)
 */
export async function markOverlayPermissionGranted(granted: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_OVERLAY, granted ? "true" : "false");
}

/**
 * Verifica se o usuário confirmou ter concedido a permissão de overlay.
 */
export async function getOverlayPermissionGranted(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEY_OVERLAY);
  return value === "true";
}

/**
 * Salva localmente que o usuário confirmou ter ativado o Accessibility Service.
 */
export async function markAccessibilityPermissionGranted(granted: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_ACCESSIBILITY, granted ? "true" : "false");
}

/**
 * Verifica se o usuário confirmou ter ativado o Accessibility Service.
 */
export async function getAccessibilityPermissionGranted(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEY_ACCESSIBILITY);
  return value === "true";
}

/**
 * Retorna o status de ambas as permissões necessárias para o overlay funcionar.
 */
export async function getOverlayReadiness(): Promise<{
  overlayGranted: boolean;
  accessibilityGranted: boolean;
  isAndroid: boolean;
}> {
  if (!isAndroid) {
    return {
      overlayGranted: false,
      accessibilityGranted: false,
      isAndroid: false,
    };
  }

  const [overlayGranted, accessibilityGranted] = await Promise.all([
    getOverlayPermissionGranted(),
    getAccessibilityPermissionGranted(),
  ]);

  return { overlayGranted, accessibilityGranted, isAndroid: true };
}
