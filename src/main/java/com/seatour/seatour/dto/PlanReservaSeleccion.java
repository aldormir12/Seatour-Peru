package com.seatour.seatour.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record PlanReservaSeleccion(
        @NotNull @Valid ComposicionPasajeros composicion,
        @NotEmpty @Size(max = 20) List<@NotNull @Valid Item> items,
        @Size(max = 50) List<@NotNull @Positive Long> adicionalesIds,
        @PositiveOrZero BigDecimal subtotalAdicionalesEsperado) {
    public int totalPasajeros() { return composicion.totalPasajeros(); }
    public record Item(@NotNull @Positive Long salidaId, @Positive BigDecimal precioEsperado) {}
}
