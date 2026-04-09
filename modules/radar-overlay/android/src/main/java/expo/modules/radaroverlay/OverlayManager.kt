package expo.modules.radaroverlay

import android.content.Context
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.roundToInt

/**
 * OverlayManager — Gerencia o overlay (pop-up) do semáforo sobre outros apps.
 *
 * Usa WindowManager com TYPE_APPLICATION_OVERLAY para desenhar sobre outros apps.
 * Design premium com efeito glassmorphism (fundo semi-transparente com blur),
 * bordas arredondadas, cores OLED black e indicadores neon.
 */
class OverlayManager(private val context: Context) {

    companion object {
        private const val TAG = "OverlayManager"
    }

    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val handler = Handler(Looper.getMainLooper())
    private var overlayView: View? = null
    private var dismissRunnable: Runnable? = null

    // Configurações visuais (atualizadas pelo JS)
    private var fontSize = 15
    private var transparency = 0.85f
    private var durationSeconds = 5
    private var showKm = true
    private var showHour = true
    private var showMinute = true
    private var showRating = true

    // Cores do tema
    private val colorOledBlack = Color.parseColor("#0A0A0A")
    private val colorCardBg = Color.parseColor("#1A1A1A")
    private val colorBorder = Color.parseColor("#2A2A2A")
    private val colorTextPrimary = Color.parseColor("#FFFFFF")
    private val colorTextSecondary = Color.parseColor("#8E8E93")
    private val colorOrange = Color.parseColor("#FF6B00")

    // Cores neon do semáforo
    private val colorNeonGreen = Color.parseColor("#00FF88")
    private val colorNeonYellow = Color.parseColor("#FFD600")
    private val colorNeonRed = Color.parseColor("#FF3B30")

    /**
     * Exibe o overlay com os dados da oferta de corrida.
     */
    fun show(offer: RideOffer) {
        // Verifica permissão de overlay
        if (!Settings.canDrawOverlays(context)) {
            Log.w(TAG, "Permissão de overlay não concedida")
            return
        }

        handler.post {
            try {
                // Remove overlay anterior se existir
                dismiss()

                // Cria a view do overlay
                val view = createOverlayView(offer)
                overlayView = view

                // Configura os parâmetros da janela
                val params = createWindowParams()

                // Adiciona ao WindowManager
                windowManager.addView(view, params)

                // Animação de entrada (slide + fade)
                animateIn(view)

                // Auto-dismiss após duração configurada
                dismissRunnable = Runnable { animateOut(view) }
                handler.postDelayed(dismissRunnable!!, durationSeconds * 1000L)

                Log.d(TAG, "Overlay exibido: ${offer.semaphoreColor} | R$${offer.value}")

            } catch (e: Exception) {
                Log.e(TAG, "Erro ao exibir overlay: ${e.message}", e)
            }
        }
    }

    /**
     * Remove o overlay da tela.
     */
    fun dismiss() {
        handler.post {
            try {
                dismissRunnable?.let { handler.removeCallbacks(it) }
                overlayView?.let {
                    windowManager.removeView(it)
                }
                overlayView = null
            } catch (e: Exception) {
                Log.d(TAG, "Erro ao remover overlay: ${e.message}")
            }
        }
    }

    /**
     * Atualiza as configurações visuais do overlay.
     */
    fun updateVisualSettings(
        fontSize: Int,
        transparency: Float,
        durationSeconds: Int,
        showKm: Boolean,
        showHour: Boolean,
        showMinute: Boolean,
        showRating: Boolean
    ) {
        this.fontSize = fontSize
        this.transparency = transparency / 100f // Converte de 30-100 para 0.3-1.0
        this.durationSeconds = durationSeconds
        this.showKm = showKm
        this.showHour = showHour
        this.showMinute = showMinute
        this.showRating = showRating
    }

    // ─── View Creation ───

    private fun createOverlayView(offer: RideOffer): View {
        val dp = { value: Int -> dpToPx(value) }
        val semaphoreColor = getSemaphoreColor(offer.semaphoreColor)
        val semaphoreGlow = getSemaphoreGlowColor(offer.semaphoreColor)

        // Container principal com glassmorphism
        val container = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(14), dp(16), dp(14))

            // Background glassmorphism: fundo escuro semi-transparente com borda
            val bgDrawable = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(20).toFloat()
                // Fundo com transparência configurável
                val alpha = (transparency * 255).roundToInt()
                setColor(Color.argb(alpha, 10, 10, 10))
                // Borda com cor do semáforo (glow sutil)
                setStroke(dp(2), semaphoreGlow)
            }
            background = bgDrawable

            // Elevação para sombra
            elevation = dp(12).toFloat()
        }

        // ─── Header: App + Semáforo ───
        val headerRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // Indicador de cor do semáforo (círculo neon)
        val semaphoreIndicator = View(context).apply {
            val size = dp(14)
            layoutParams = LinearLayout.LayoutParams(size, size).apply {
                marginEnd = dp(8)
            }
            val circleDrawable = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(semaphoreColor)
                // Glow effect via stroke
                setStroke(dp(1), semaphoreGlow)
            }
            background = circleDrawable
        }
        headerRow.addView(semaphoreIndicator)

        // Nome do app
        val appLabel = TextView(context).apply {
            text = getAppDisplayName(offer.app)
            setTextColor(colorTextSecondary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, (fontSize - 2).toFloat())
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        headerRow.addView(appLabel)

        // Valor principal com cor do semáforo
        val valueLabel = TextView(context).apply {
            text = "R$ %.2f".format(offer.value)
            setTextColor(semaphoreColor)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, (fontSize + 4).toFloat())
            typeface = Typeface.create("sans-serif-black", Typeface.BOLD)
            // Shadow glow neon
            setShadowLayer(dp(8).toFloat(), 0f, 0f, semaphoreGlow)
        }
        headerRow.addView(valueLabel)

        container.addView(headerRow)

        // ─── Métricas ───
        val metricsRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dp(8)
            }
        }

        // Adiciona métricas configuradas
        val metrics = mutableListOf<Pair<String, String>>()
        if (showKm) metrics.add("R$/km" to "%.2f".format(offer.earningsPerKm))
        if (showHour) metrics.add("R$/h" to "%.0f".format(offer.earningsPerHour))
        if (showMinute) metrics.add("R$/min" to "%.2f".format(offer.earningsPerMinute))
        if (showRating && offer.passengerRating > 0) {
            metrics.add("★" to "%.1f".format(offer.passengerRating))
        }

        metrics.forEachIndexed { index, (label, value) ->
            if (index > 0) {
                // Separador
                val sep = View(context).apply {
                    layoutParams = LinearLayout.LayoutParams(dp(1), dp(16)).apply {
                        marginStart = dp(10)
                        marginEnd = dp(10)
                    }
                    setBackgroundColor(colorBorder)
                }
                metricsRow.addView(sep)
            }

            val metricView = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            val metricValue = TextView(context).apply {
                text = value
                setTextColor(colorTextPrimary)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, fontSize.toFloat())
                typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
                gravity = Gravity.CENTER
            }
            metricView.addView(metricValue)

            val metricLabel = TextView(context).apply {
                text = label
                setTextColor(colorTextSecondary)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, (fontSize - 4).toFloat())
                gravity = Gravity.CENTER
            }
            metricView.addView(metricLabel)

            metricsRow.addView(metricView)
        }

        container.addView(metricsRow)

        // ─── Distância e tempo ───
        val infoRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = dp(6)
            }
        }

        val distTimeText = TextView(context).apply {
            val parts = mutableListOf<String>()
            if (offer.distanceKm > 0) parts.add("%.1f km".format(offer.distanceKm))
            if (offer.estimatedMinutes > 0) parts.add("%.0f min".format(offer.estimatedMinutes))
            text = parts.joinToString(" · ")
            setTextColor(colorTextSecondary)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, (fontSize - 3).toFloat())
            gravity = Gravity.CENTER
        }
        infoRow.addView(distTimeText)

        container.addView(infoRow)

        return container
    }

    // ─── Window Params ───

    private fun createWindowParams(): WindowManager.LayoutParams {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            x = 0
            y = dpToPx(48) // Abaixo da status bar
            // Margens horizontais
            horizontalMargin = 0.04f // 4% de margem em cada lado
        }
    }

    // ─── Animations ───

    private fun animateIn(view: View) {
        view.alpha = 0f
        view.translationY = -dpToPx(30).toFloat()
        view.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(300)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .start()
    }

    private fun animateOut(view: View) {
        view.animate()
            .alpha(0f)
            .translationY(-dpToPx(20).toFloat())
            .setDuration(250)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .withEndAction {
                try {
                    windowManager.removeView(view)
                    if (overlayView == view) overlayView = null
                } catch (e: Exception) {
                    Log.d(TAG, "View já removida")
                }
            }
            .start()
    }

    // ─── Helpers ───

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            context.resources.displayMetrics
        ).roundToInt()
    }

    private fun getSemaphoreColor(color: String): Int {
        return when (color) {
            "green" -> colorNeonGreen
            "yellow" -> colorNeonYellow
            "red" -> colorNeonRed
            else -> colorOrange
        }
    }

    private fun getSemaphoreGlowColor(color: String): Int {
        // Versão mais transparente para o glow/borda
        return when (color) {
            "green" -> Color.parseColor("#4000FF88")
            "yellow" -> Color.parseColor("#40FFD600")
            "red" -> Color.parseColor("#40FF3B30")
            else -> Color.parseColor("#40FF6B00")
        }
    }

    private fun getAppDisplayName(app: String): String {
        return when (app) {
            "uber" -> "Uber"
            "99" -> "99"
            "indriver" -> "InDrive"
            else -> app.uppercase()
        }
    }
}
