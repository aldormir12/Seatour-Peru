package com.seatour.seatour.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Horarios locales de America/Lima, conservando la fecha si el fin cruza
 * medianoche.
 */
public record PlanDiaRespuesta(List<Item> items, BigDecimal precioTotalPorPersona,
                long duracionExperienciasMinutos, LocalDateTime horaInicioPlan, LocalDateTime horaFinPlan) {
        public record Item(Long tourId, String tourNombre, Long salidaId,
                        LocalDateTime horaInicio, LocalDateTime horaFin, int duracionMinutos,
                        int score, BigDecimal precioBase, String imagenUrl) {
        }
}
