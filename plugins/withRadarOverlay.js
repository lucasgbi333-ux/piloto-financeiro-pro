/**
 * Expo Config Plugin: withRadarOverlay
 *
 * Adiciona a permissão SYSTEM_ALERT_WINDOW ao AndroidManifest.xml do app principal.
 * O AccessibilityService já é declarado no AndroidManifest do módulo (modules/radar-overlay).
 */
const { withAndroidManifest } = require("@expo/config-plugins");

function withRadarOverlay(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;

    // Ensure uses-permission array exists
    if (!manifest.manifest["uses-permission"]) {
      manifest.manifest["uses-permission"] = [];
    }

    const permissions = manifest.manifest["uses-permission"];

    // Add SYSTEM_ALERT_WINDOW if not present
    const hasOverlayPerm = permissions.some(
      (p) =>
        p.$?.["android:name"] === "android.permission.SYSTEM_ALERT_WINDOW"
    );
    if (!hasOverlayPerm) {
      permissions.push({
        $: { "android:name": "android.permission.SYSTEM_ALERT_WINDOW" },
      });
    }

    // Add FOREGROUND_SERVICE if not present
    const hasForegroundPerm = permissions.some(
      (p) =>
        p.$?.["android:name"] === "android.permission.FOREGROUND_SERVICE"
    );
    if (!hasForegroundPerm) {
      permissions.push({
        $: { "android:name": "android.permission.FOREGROUND_SERVICE" },
      });
    }

    return config;
  });
}

module.exports = withRadarOverlay;
