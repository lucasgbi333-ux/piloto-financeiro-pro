package expo.modules.radaroverlay

/**
 * Modelo de dados representando uma oferta de corrida extraída
 * dos apps Uber, 99 ou InDrive via AccessibilityService.
 */
data class RideOffer(
    /** App de origem: "uber", "99", "indriver" */
    val app: String,
    /** Valor da corrida em R$ */
    val value: Double,
    /** Distância em km */
    val distanceKm: Double,
    /** Tempo estimado em minutos */
    val estimatedMinutes: Double,
    /** Nota do passageiro (0.0 se não disponível) */
    val passengerRating: Double,
    /** Ganhos por km calculado */
    val earningsPerKm: Double,
    /** Ganhos por hora calculado */
    val earningsPerHour: Double,
    /** Ganhos por minuto calculado */
    val earningsPerMinute: Double,
    /** Cor do semáforo: "green", "yellow", "red" */
    val semaphoreColor: String,
    /** Texto bruto da notificação/tela (para debug) */
    val rawText: String,
    /** Timestamp da captura */
    val timestamp: Long = System.currentTimeMillis()
) {
    companion object {
        /**
         * Calcula os ganhos e determina a cor do semáforo.
         */
        fun calculate(
            app: String,
            value: Double,
            distanceKm: Double,
            estimatedMinutes: Double,
            passengerRating: Double,
            rawText: String,
            // Limites do semáforo (vindos das configurações do usuário)
            limiteKmRuim: Double,
            limiteKmBom: Double,
            limiteHoraRuim: Double,
            limiteHoraBom: Double,
            limiteNotaRuim: Double,
            limiteNotaBom: Double
        ): RideOffer {
            val earningsPerKm = if (distanceKm > 0) value / distanceKm else 0.0
            val earningsPerHour = if (estimatedMinutes > 0) (value / estimatedMinutes) * 60.0 else 0.0
            val earningsPerMinute = if (estimatedMinutes > 0) value / estimatedMinutes else 0.0

            // Lógica do semáforo: prioriza ganhos/km, depois hora, depois nota
            val semaphoreColor = determineSemaphore(
                earningsPerKm, earningsPerHour, passengerRating,
                limiteKmRuim, limiteKmBom,
                limiteHoraRuim, limiteHoraBom,
                limiteNotaRuim, limiteNotaBom
            )

            return RideOffer(
                app = app,
                value = value,
                distanceKm = distanceKm,
                estimatedMinutes = estimatedMinutes,
                passengerRating = passengerRating,
                earningsPerKm = earningsPerKm,
                earningsPerHour = earningsPerHour,
                earningsPerMinute = earningsPerMinute,
                semaphoreColor = semaphoreColor,
                rawText = rawText
            )
        }

        private fun determineSemaphore(
            earningsPerKm: Double,
            earningsPerHour: Double,
            passengerRating: Double,
            limiteKmRuim: Double,
            limiteKmBom: Double,
            limiteHoraRuim: Double,
            limiteHoraBom: Double,
            limiteNotaRuim: Double,
            limiteNotaBom: Double
        ): String {
            // Pontuação: cada métrica contribui com um score
            var score = 0

            // Ganhos por Km
            if (earningsPerKm >= limiteKmBom) score += 2
            else if (earningsPerKm >= limiteKmRuim) score += 1
            // else score += 0 (ruim)

            // Ganhos por Hora
            if (earningsPerHour >= limiteHoraBom) score += 2
            else if (earningsPerHour >= limiteHoraRuim) score += 1

            // Nota do passageiro (se disponível)
            if (passengerRating > 0) {
                if (passengerRating >= limiteNotaBom) score += 2
                else if (passengerRating >= limiteNotaRuim) score += 1
            } else {
                // Se não tem nota, assume neutro
                score += 1
            }

            // Score máximo: 6 (3 métricas x 2 pontos)
            // Verde: >= 4, Amarelo: 2-3, Vermelho: 0-1
            return when {
                score >= 4 -> "green"
                score >= 2 -> "yellow"
                else -> "red"
            }
        }
    }
}
