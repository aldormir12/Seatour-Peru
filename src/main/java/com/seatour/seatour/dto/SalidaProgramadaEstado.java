package com.seatour.seatour.dto;

import com.seatour.seatour.model.EstadoSalida;
import jakarta.validation.constraints.NotNull;

public record SalidaProgramadaEstado(
        @NotNull(message = "El estado es obligatorio") EstadoSalida estado,
        String motivoCancelacion) {
    public SalidaProgramadaEstado(EstadoSalida estado) { this(estado, null); }
}
