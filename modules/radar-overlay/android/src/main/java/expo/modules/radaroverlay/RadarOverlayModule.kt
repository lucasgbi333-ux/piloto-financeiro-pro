package expo.modules.radaroverlay

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * RadarOverlayModule — Bridge Expo Modules API (JS ↔ Kotlin)
 *
 * Expõe funções para o JavaScript controlar o overlay e o serviço de acessibilidade:
 * - Verificar/solicitar permissões
 * - Atualizar configurações do semáforo
 * - Atualizar configurações visuais do overlay
 * - Verificar status do serviço
 * - Enviar eventos de oferta de corrida para o JS
 */
class RadarOverlayModule : Module() {

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React context not available")

    override fun definition() = ModuleDefinition {
        Name("RadarOverlay")

        // ─── Eventos enviados para o JS ───
        Events("onRideOffer", "onServiceStatusChanged")

        // ─── Permissões ───

        /**
         * Verifica se a permissão de overlay (SYSTEM_ALERT_WINDOW) está concedida.
         */
        Function("canDrawOverlays") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true
            }
        }

        /**
         * Abre as configurações de permissão de overlay do Android.
         */
        Function("requestOverlayPermission") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${context.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
        }

        /**
         * Abre as configurações de Acessibilidade do Android.
         */
        Function("openAccessibilitySettings") {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }

        /**
         * Verifica se o AccessibilityService está ativo.
         */
        Function("isAccessibilityServiceRunning") {
            RadarAccessibilityService.isRunning
        }

        // ─── Configurações do Semáforo ───

        /**
         * Atualiza as configurações do semáforo e dos apps habilitados.
         * Recebe um mapa de chave-valor.
         */
        Function("updateSettings") { settings: Map<String, Any> ->
            // Salva nas SharedPreferences (acessível pelo AccessibilityService)
            val prefs = context.getSharedPreferences("radar_ganhos_prefs", Context.MODE_PRIVATE)
            val editor = prefs.edit()

            settings.forEach { (key, value) ->
                when (value) {
                    is Boolean -> editor.putBoolean(key, value)
                    is Double -> editor.putFloat(key, value.toFloat())
                    is Int -> editor.putInt(key, value)
                    is String -> editor.putString(key, value)
                    is Number -> editor.putFloat(key, value.toFloat())
                }
            }
            editor.apply()

            // Se o serviço está ativo, atualiza em tempo real
            RadarAccessibilityService.instance?.updateSettings(settings)
        }

        /**
         * Atualiza as configurações visuais do overlay.
         */
        Function("updateOverlayVisuals") { config: Map<String, Any> ->
            val fontSize = (config["fontSize"] as? Number)?.toInt() ?: 15
            val transparency = (config["transparency"] as? Number)?.toFloat() ?: 85f
            val duration = (config["duration"] as? Number)?.toInt() ?: 5
            val showKm = config["showKm"] as? Boolean ?: true
            val showHour = config["showHour"] as? Boolean ?: true
            val showMinute = config["showMinute"] as? Boolean ?: true
            val showRating = config["showRating"] as? Boolean ?: true

            // Salva nas SharedPreferences
            val prefs = context.getSharedPreferences("radar_ganhos_prefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putInt("overlay_font_size", fontSize)
                .putFloat("overlay_transparency", transparency)
                .putInt("overlay_duration", duration)
                .putBoolean("overlay_show_km", showKm)
                .putBoolean("overlay_show_hour", showHour)
                .putBoolean("overlay_show_minute", showMinute)
                .putBoolean("overlay_show_rating", showRating)
                .apply()

            // Atualiza no serviço em tempo real
            RadarAccessibilityService.instance?.updateOverlaySettings(
                fontSize, transparency, duration, showKm, showHour, showMinute, showRating
            )
        }

        /**
         * Sincroniza todas as configurações do JS para o SharedPreferences nativo.
         * Chamado quando o app inicia ou quando o usuário muda configurações.
         */
        Function("syncAllSettings") { config: Map<String, Any> ->
            val prefs = context.getSharedPreferences("radar_ganhos_prefs", Context.MODE_PRIVATE)
            val editor = prefs.edit()

            // Semáforo
            editor.putBoolean("semaforo_enabled", config["semaforoEnabled"] as? Boolean ?: true)

            // Limites do semáforo
            (config["limiteKmRuim"] as? Number)?.let { editor.putFloat("limite_km_ruim", it.toFloat()) }
            (config["limiteKmBom"] as? Number)?.let { editor.putFloat("limite_km_bom", it.toFloat()) }
            (config["limiteHoraRuim"] as? Number)?.let { editor.putFloat("limite_hora_ruim", it.toFloat()) }
            (config["limiteHoraBom"] as? Number)?.let { editor.putFloat("limite_hora_bom", it.toFloat()) }
            (config["limiteNotaRuim"] as? Number)?.let { editor.putFloat("limite_nota_ruim", it.toFloat()) }
            (config["limiteNotaBom"] as? Number)?.let { editor.putFloat("limite_nota_bom", it.toFloat()) }

            // Apps
            editor.putBoolean("app_uber", config["appUber"] as? Boolean ?: true)
            editor.putBoolean("app_99", config["app99"] as? Boolean ?: true)
            editor.putBoolean("app_indriver", config["appIndriver"] as? Boolean ?: true)

            // Captura de tela
            editor.putBoolean("captura_tela_enabled", config["capturaTelaEnabled"] as? Boolean ?: false)

            // Overlay
            editor.putBoolean("overlay_enabled", true)
            (config["overlayFontSize"] as? Number)?.let { editor.putInt("overlay_font_size", it.toInt()) }
            (config["overlayTransparency"] as? Number)?.let { editor.putFloat("overlay_transparency", it.toFloat()) }
            (config["overlayDuration"] as? Number)?.let { editor.putInt("overlay_duration", it.toInt()) }
            editor.putBoolean("overlay_show_km", config["overlayShowKm"] as? Boolean ?: true)
            editor.putBoolean("overlay_show_hour", config["overlayShowHour"] as? Boolean ?: true)
            editor.putBoolean("overlay_show_minute", config["overlayShowMinute"] as? Boolean ?: true)
            editor.putBoolean("overlay_show_rating", config["overlayShowRating"] as? Boolean ?: true)

            editor.apply()
        }

        /**
         * Testa o overlay com dados fictícios (para o usuário ver como ficará).
         */
        Function("testOverlay") { config: Map<String, Any> ->
            val semaphoreColor = config["semaphoreColor"] as? String ?: "green"
            val testOffer = RideOffer(
                app = "uber",
                value = 18.50,
                distanceKm = 7.2,
                estimatedMinutes = 15.0,
                passengerRating = 4.92,
                earningsPerKm = 2.57,
                earningsPerHour = 74.0,
                earningsPerMinute = 1.23,
                semaphoreColor = semaphoreColor,
                rawText = "Teste do overlay"
            )

            // Cria um OverlayManager temporário para teste
            if (Settings.canDrawOverlays(context)) {
                val overlayManager = OverlayManager(context)

                // Aplica configurações visuais
                val fontSize = (config["fontSize"] as? Number)?.toInt() ?: 15
                val transparency = (config["transparency"] as? Number)?.toFloat() ?: 85f
                val duration = (config["duration"] as? Number)?.toInt() ?: 5

                overlayManager.updateVisualSettings(
                    fontSize = fontSize,
                    transparency = transparency,
                    durationSeconds = duration,
                    showKm = config["showKm"] as? Boolean ?: true,
                    showHour = config["showHour"] as? Boolean ?: true,
                    showMinute = config["showMinute"] as? Boolean ?: true,
                    showRating = config["showRating"] as? Boolean ?: true
                )

                overlayManager.show(testOffer)
                true
            } else {
                false
            }
        }

        // ─── Lifecycle ───

        OnCreate {
            // Registra callback para receber ofertas de corrida do AccessibilityService
            RadarAccessibilityService.onRideOfferDetected = { offer ->
                sendEvent("onRideOffer", mapOf(
                    "app" to offer.app,
                    "value" to offer.value,
                    "distanceKm" to offer.distanceKm,
                    "estimatedMinutes" to offer.estimatedMinutes,
                    "passengerRating" to offer.passengerRating,
                    "earningsPerKm" to offer.earningsPerKm,
                    "earningsPerHour" to offer.earningsPerHour,
                    "earningsPerMinute" to offer.earningsPerMinute,
                    "semaphoreColor" to offer.semaphoreColor,
                    "timestamp" to offer.timestamp
                ))
            }
        }

        OnDestroy {
            RadarAccessibilityService.onRideOfferDetected = null
        }
    }
}
