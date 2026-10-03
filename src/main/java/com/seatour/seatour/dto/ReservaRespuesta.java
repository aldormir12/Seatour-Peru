package com.seatour.seatour.dto;

import com.seatour.seatour.model.EstadoReserva;
import java.math.BigDecimal;
import java.time.*;

public record ReservaRespuesta(Long id, Long clienteId, String clienteNombre,
        Long salidaId, String tourNombre, LocalDate fecha, LocalTime horaSalida,
        String embarcacionNombre, int pasajeros, BigDecimal precioUnitario, BigDecimal precioTotal,
        String moneda, EstadoReserva estado, Instant creadaEn, Instant confirmadaEn, Instant canceladaEn,
        int cuposDisponibles, boolean puedeConfirmar, boolean puedeCancelar, Integer ninos, Integer adultos, Integer adultosMayores, int totalPasajeros, BigDecimal subtotalAdicionales,
        java.util.List<ReservaAdicionalRespuesta> adicionales, Long tourId,
        com.seatour.seatour.model.EstadoSalida estadoSalida, boolean puedeCalificar,
        ResenaRespuesta resena) {}
