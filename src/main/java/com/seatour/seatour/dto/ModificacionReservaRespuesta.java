package com.seatour.seatour.dto;

import com.seatour.seatour.model.ModificacionReserva;
import java.math.BigDecimal;
import java.time.Instant;

public record ModificacionReservaRespuesta(Long id, Long actorId, String actorRol, Instant creadaEn,
        BigDecimal totalAnterior, BigDecimal totalNuevo, BigDecimal ajusteSimulado, String tipo,
        String detalleAnterior, String detalleNuevo) {
    public static ModificacionReservaRespuesta desde(ModificacionReserva m) {
        return new ModificacionReservaRespuesta(m.getId(), m.getActorId(), m.getActorRol(), m.getCreadaEn(),
                m.getTotalAnterior(), m.getTotalNuevo(), m.getAjusteSimulado(), m.getTipo(),
                m.getDetalleAnterior(), m.getDetalleNuevo());
    }
}
