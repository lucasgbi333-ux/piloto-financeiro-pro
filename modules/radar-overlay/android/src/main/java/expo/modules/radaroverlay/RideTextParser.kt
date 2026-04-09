package expo.modules.radaroverlay

import android.util.Log

/**
 * Parser de texto para extrair dados de corridas dos apps Uber, 99 e InDrive.
 *
 * Cada app tem um formato diferente de notificação/tela de oferta:
 *
 * UBER Driver:
 *   - Notificação: "Nova viagem: R$ 15,50 · 5,2 km · 12 min"
 *   - Tela: Valor, distância, tempo estimado, nota do passageiro
 *
 * 99 Driver:
 *   - Notificação: "Corrida disponível - R$ 12,00 - 3,8 km"
 *   - Tela: Valor, distância, tempo, nota
 *
 * InDrive:
 *   - Notificação: "Pedido de viagem: R$ 20,00"
 *   - Tela: Valor oferecido, distância
 */
object RideTextParser {

    private const val TAG = "RideTextParser"

    /**
     * Resultado do parsing de texto
     */
    data class ParseResult(
        val value: Double,
        val distanceKm: Double,
        val estimatedMinutes: Double,
        val passengerRating: Double,
        val success: Boolean
    )

    /**
     * Tenta extrair dados de corrida do texto capturado.
     * Tenta múltiplos padrões para cada app.
     */
    fun parse(text: String, app: String): ParseResult {
        return when (app) {
            "uber" -> parseUber(text)
            "99" -> parse99(text)
            "indriver" -> parseInDriver(text)
            else -> ParseResult(0.0, 0.0, 0.0, 0.0, false)
        }
    }

    /**
     * Detecta qual app originou o texto baseado em palavras-chave.
     */
    fun detectApp(text: String, packageName: String?): String? {
        return when {
            packageName?.contains("ubercab") == true -> "uber"
            packageName?.contains("driver99") == true || packageName?.contains("99") == true -> "99"
            packageName?.contains("indriver") == true -> "indriver"
            // Fallback: detecta pelo conteúdo do texto
            text.contains("Uber", ignoreCase = true) -> "uber"
            text.contains("99", ignoreCase = true) && text.contains("corrida", ignoreCase = true) -> "99"
            text.contains("InDrive", ignoreCase = true) || text.contains("inDriver", ignoreCase = true) -> "indriver"
            else -> null
        }
    }

    // ─── Uber ───

    private fun parseUber(text: String): ParseResult {
        val value = extractCurrency(text)
        val distance = extractDistance(text)
        val time = extractTime(text)
        val rating = extractRating(text)

        Log.d(TAG, "Uber parsed: value=$value, dist=$distance, time=$time, rating=$rating")

        return ParseResult(
            value = value,
            distanceKm = distance,
            estimatedMinutes = time,
            passengerRating = rating,
            success = value > 0
        )
    }

    // ─── 99 ───

    private fun parse99(text: String): ParseResult {
        val value = extractCurrency(text)
        val distance = extractDistance(text)
        val time = extractTime(text)
        val rating = extractRating(text)

        Log.d(TAG, "99 parsed: value=$value, dist=$distance, time=$time, rating=$rating")

        return ParseResult(
            value = value,
            distanceKm = distance,
            estimatedMinutes = time,
            passengerRating = rating,
            success = value > 0
        )
    }

    // ─── InDrive ───

    private fun parseInDriver(text: String): ParseResult {
        val value = extractCurrency(text)
        val distance = extractDistance(text)
        val time = extractTime(text)
        val rating = extractRating(text)

        Log.d(TAG, "InDrive parsed: value=$value, dist=$distance, time=$time, rating=$rating")

        return ParseResult(
            value = value,
            distanceKm = distance,
            estimatedMinutes = time,
            passengerRating = rating,
            success = value > 0
        )
    }

    // ─── Extraction Helpers ───

    /**
     * Extrai valor monetário (R$ X,XX ou R$ X.XX ou R$XX)
     */
    private fun extractCurrency(text: String): Double {
        // Padrões: "R$ 15,50", "R$15.50", "R$ 15", "15,50"
        val patterns = listOf(
            Regex("""R\$\s*(\d+[.,]\d{2})"""),
            Regex("""R\$\s*(\d+)"""),
            Regex("""(\d+[.,]\d{2})\s*(?:reais|R\$)"""),
        )

        for (pattern in patterns) {
            val match = pattern.find(text)
            if (match != null) {
                val valueStr = match.groupValues[1].replace(",", ".")
                return valueStr.toDoubleOrNull() ?: 0.0
            }
        }
        return 0.0
    }

    /**
     * Extrai distância em km
     */
    private fun extractDistance(text: String): Double {
        // Padrões: "5,2 km", "5.2km", "5 km"
        val patterns = listOf(
            Regex("""(\d+[.,]\d+)\s*km""", RegexOption.IGNORE_CASE),
            Regex("""(\d+)\s*km""", RegexOption.IGNORE_CASE),
            Regex("""dist[aâ]ncia[:\s]*(\d+[.,]?\d*)\s*km""", RegexOption.IGNORE_CASE),
        )

        for (pattern in patterns) {
            val match = pattern.find(text)
            if (match != null) {
                val distStr = match.groupValues[1].replace(",", ".")
                return distStr.toDoubleOrNull() ?: 0.0
            }
        }
        return 0.0
    }

    /**
     * Extrai tempo estimado em minutos
     */
    private fun extractTime(text: String): Double {
        // Padrões: "12 min", "12min", "12 minutos"
        val patterns = listOf(
            Regex("""(\d+)\s*min""", RegexOption.IGNORE_CASE),
            Regex("""(\d+)\s*minuto""", RegexOption.IGNORE_CASE),
            Regex("""tempo[:\s]*(\d+)""", RegexOption.IGNORE_CASE),
        )

        for (pattern in patterns) {
            val match = pattern.find(text)
            if (match != null) {
                return match.groupValues[1].toDoubleOrNull() ?: 0.0
            }
        }
        return 0.0
    }

    /**
     * Extrai nota do passageiro (4.85, 4,9, etc.)
     */
    private fun extractRating(text: String): Double {
        // Padrões: "4.85", "4,9", "★ 4.85", "nota: 4.9"
        val patterns = listOf(
            Regex("""[★☆]\s*(\d[.,]\d+)"""),
            Regex("""nota[:\s]*(\d[.,]\d+)""", RegexOption.IGNORE_CASE),
            Regex("""avalia[çc][ãa]o[:\s]*(\d[.,]\d+)""", RegexOption.IGNORE_CASE),
            // Genérico: número entre 4.0 e 5.0 que parece ser nota
            Regex("""(?<!\d)([4-5][.,]\d{1,2})(?!\d)"""),
        )

        for (pattern in patterns) {
            val match = pattern.find(text)
            if (match != null) {
                val ratingStr = match.groupValues[1].replace(",", ".")
                val rating = ratingStr.toDoubleOrNull() ?: 0.0
                // Valida que é uma nota razoável (entre 1.0 e 5.0)
                if (rating in 1.0..5.0) return rating
            }
        }
        return 0.0
    }
}
