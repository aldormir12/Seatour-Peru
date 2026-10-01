package com.seatour.seatour.dto;

import com.seatour.seatour.model.ZonaMaritima;
import java.time.LocalDateTime;

public record LiveSalidaRespuesta(Long id, Referencia tour, String imagenUrl, ZonaMaritima zonaMaritima,
        Referencia embarcacion, Referencia operador, LocalDateTime inicioReal, Integer cuposDisponibles) {
    public record Referencia(Long id, String nombre) {}
}
