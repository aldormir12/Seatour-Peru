package com.seatour.seatour.dto;
import com.seatour.seatour.model.TipoPasajero;
import java.math.BigDecimal;
public record TarifaPasajeroRespuesta(TipoPasajero tipo, String nombre, int edadMinima,
        Integer edadMaxima, BigDecimal porcentajeDescuento) {}
