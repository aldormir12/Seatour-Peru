package com.seatour.seatour.dto;

import com.seatour.seatour.model.EstadoPago;
import java.math.BigDecimal;
import java.util.List;

public record PlanReservaPagoRespuesta(EstadoPago estadoPago, String mensaje,
        List<ReservaRespuesta> reservas, BigDecimal total) {}
