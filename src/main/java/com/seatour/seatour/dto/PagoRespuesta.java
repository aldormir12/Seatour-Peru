package com.seatour.seatour.dto;
import com.seatour.seatour.model.*;
import java.math.BigDecimal;
public record PagoRespuesta(EstadoPago estadoPago, EstadoReserva estadoReserva, Long reservaId,
        Long pagoId, MetodoPago metodo, BigDecimal monto, String referencia, String mensaje,
        String motivoRechazo) {}
