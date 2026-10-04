package com.seatour.seatour.dto;

import java.math.BigDecimal;
import java.util.List;

public record PlanReservaResumen(List<Item> items, BigDecimal total, boolean disponible,
        List<ReservaAdicionalRespuesta> adicionales, BigDecimal subtotalAdicionales) {
    public record Item(Long salidaId, String tourNombre, int cuposDisponibles,
            BigDecimal subtotal, String problema) {}
}
