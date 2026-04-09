package expo.modules.radaroverlay

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.content.SharedPreferences
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * AccessibilityService que monitora os apps de corrida (Uber, 99, InDrive)
 * e extrai dados das ofertas de corrida em tempo real.
 *
 * Fluxo:
 * 1. Recebe eventos de acessibilidade (notificações, mudanças de janela)
 * 2. Filtra apenas os apps de corrida configurados
 * 3. Extrai texto da tela/notificação
 * 4. Parseia os dados (valor, distância, tempo, nota)
 * 5. Calcula métricas (ganhos/km, ganhos/hora)
 * 6. Envia para o OverlayManager exibir o semáforo
 */
class RadarAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "RadarAccessibility"
        private const val PREFS_NAME = "radar_ganhos_prefs"

        // Singleton para comunicação com o módulo Expo
        var instance: RadarAccessibilityService? = null
            private set

        var isRunning = false
            private set

        // Callback para enviar dados ao JS
        var onRideOfferDetected: ((RideOffer) -> Unit)? = null
    }

    private lateinit var prefs: SharedPreferences
    private var overlayManager: OverlayManager? = null
    private var lastProcessedText = ""
    private var lastProcessedTime = 0L
    private val DEBOUNCE_MS = 2000L // Evita processar o mesmo texto repetidamente

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        isRunning = true
        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        overlayManager = OverlayManager(this)

        Log.i(TAG, "AccessibilityService conectado - Radar de Ganhos ativo")

        // Configura o serviço
        serviceInfo = serviceInfo?.apply {
            eventTypes = AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 100
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return

        // Verifica se o app está habilitado nas configurações
        if (!isAppEnabled(packageName)) return

        // Verifica se o semáforo está habilitado
        if (!prefs.getBoolean("semaforo_enabled", true)) return

        when (event.eventType) {
            AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED -> {
                handleNotification(event, packageName)
            }
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED,
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                handleWindowChange(event, packageName)
            }
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "AccessibilityService interrompido")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        isRunning = false
        overlayManager?.dismiss()
        overlayManager = null
        Log.i(TAG, "AccessibilityService destruído")
    }

    // ─── Event Handlers ───

    private fun handleNotification(event: AccessibilityEvent, packageName: String) {
        val text = extractTextFromEvent(event)
        if (text.isBlank()) return

        Log.d(TAG, "Notificação de $packageName: $text")
        processRideText(text, packageName)
    }

    private fun handleWindowChange(event: AccessibilityEvent, packageName: String) {
        // Tenta extrair texto da janela ativa
        val rootNode = rootInActiveWindow ?: return
        val text = extractTextFromNode(rootNode)
        rootNode.recycle()

        if (text.isBlank()) return

        // Debounce: evita processar o mesmo texto repetidamente
        val now = System.currentTimeMillis()
        if (text == lastProcessedText && (now - lastProcessedTime) < DEBOUNCE_MS) return

        lastProcessedText = text
        lastProcessedTime = now

        Log.d(TAG, "Janela de $packageName: ${text.take(200)}...")
        processRideText(text, packageName)
    }

    // ─── Text Extraction ───

    private fun extractTextFromEvent(event: AccessibilityEvent): String {
        val sb = StringBuilder()
        event.text?.forEach { charSeq ->
            sb.append(charSeq).append(" ")
        }
        event.contentDescription?.let {
            sb.append(it).append(" ")
        }
        return sb.toString().trim()
    }

    private fun extractTextFromNode(node: AccessibilityNodeInfo, depth: Int = 0): String {
        if (depth > 15) return "" // Limita profundidade

        val sb = StringBuilder()

        // Extrai texto do nó atual
        node.text?.let { sb.append(it).append(" ") }
        node.contentDescription?.let { sb.append(it).append(" ") }

        // Recursivamente extrai de filhos
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            sb.append(extractTextFromNode(child, depth + 1))
            child.recycle()
        }

        return sb.toString()
    }

    // ─── Ride Processing ───

    private fun processRideText(text: String, packageName: String) {
        val app = RideTextParser.detectApp(text, packageName) ?: return
        val result = RideTextParser.parse(text, app)

        if (!result.success) {
            Log.d(TAG, "Parsing falhou para $app: texto não contém dados de corrida válidos")
            return
        }

        // Carrega limites do semáforo das preferências
        val limiteKmRuim = prefs.getFloat("limite_km_ruim", 1.50f).toDouble()
        val limiteKmBom = prefs.getFloat("limite_km_bom", 2.00f).toDouble()
        val limiteHoraRuim = prefs.getFloat("limite_hora_ruim", 25.0f).toDouble()
        val limiteHoraBom = prefs.getFloat("limite_hora_bom", 35.0f).toDouble()
        val limiteNotaRuim = prefs.getFloat("limite_nota_ruim", 4.7f).toDouble()
        val limiteNotaBom = prefs.getFloat("limite_nota_bom", 4.85f).toDouble()

        val offer = RideOffer.calculate(
            app = app,
            value = result.value,
            distanceKm = result.distanceKm,
            estimatedMinutes = result.estimatedMinutes,
            passengerRating = result.passengerRating,
            rawText = text.take(500),
            limiteKmRuim = limiteKmRuim,
            limiteKmBom = limiteKmBom,
            limiteHoraRuim = limiteHoraRuim,
            limiteHoraBom = limiteHoraBom,
            limiteNotaRuim = limiteNotaRuim,
            limiteNotaBom = limiteNotaBom
        )

        Log.i(TAG, "Oferta detectada: ${offer.app} R$${offer.value} | " +
                "${offer.earningsPerKm}/km | ${offer.earningsPerHour}/h | " +
                "Semáforo: ${offer.semaphoreColor}")

        // Exibe overlay
        val showOverlay = prefs.getBoolean("overlay_enabled", true)
        if (showOverlay) {
            overlayManager?.show(offer)
        }

        // Notifica o JS
        onRideOfferDetected?.invoke(offer)

        // Captura de tela (se habilitada)
        val capturaEnabled = prefs.getBoolean("captura_tela_enabled", false)
        if (capturaEnabled) {
            // TODO: Implementar captura de tela via MediaProjection
            Log.d(TAG, "Captura de tela habilitada mas não implementada ainda")
        }
    }

    // ─── Helpers ───

    private fun isAppEnabled(packageName: String): Boolean {
        return when {
            packageName.contains("ubercab") -> prefs.getBoolean("app_uber", true)
            packageName.contains("driver99") || packageName.contains("99") -> prefs.getBoolean("app_99", true)
            packageName.contains("indriver") -> prefs.getBoolean("app_indriver", true)
            else -> false
        }
    }

    /**
     * Atualiza as configurações do semáforo (chamado pelo módulo Expo).
     */
    fun updateSettings(settings: Map<String, Any>) {
        val editor = prefs.edit()
        settings.forEach { (key, value) ->
            when (value) {
                is Boolean -> editor.putBoolean(key, value)
                is Float -> editor.putFloat(key, value)
                is Int -> editor.putInt(key, value)
                is String -> editor.putString(key, value)
            }
        }
        editor.apply()
        Log.d(TAG, "Configurações atualizadas: $settings")
    }

    /**
     * Atualiza as configurações visuais do overlay.
     */
    fun updateOverlaySettings(
        fontSize: Int,
        transparency: Float,
        duration: Int,
        showKm: Boolean,
        showHour: Boolean,
        showMinute: Boolean,
        showRating: Boolean
    ) {
        overlayManager?.updateVisualSettings(
            fontSize = fontSize,
            transparency = transparency,
            durationSeconds = duration,
            showKm = showKm,
            showHour = showHour,
            showMinute = showMinute,
            showRating = showRating
        )
    }
}
