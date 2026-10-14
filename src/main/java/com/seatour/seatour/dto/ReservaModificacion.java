package com.seatour.seatour.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record ReservaModificacion(
        @NotNull @Min(0) @Max(100) Integer ninos,
        @NotNull @Min(0) @Max(100) Integer adultos,
        @NotNull @Min(0) @Max(100) Integer adultosMayores,
        @NotNull @Size(max = 50) List<@NotNull @Positive Long> adicionalesIds,
        @NotNull @Positive BigDecimal precioEsperado,
        @NotNull @Min(0) Long revisionEsperada) {
    public ComposicionPasajeros composicion() { return new ComposicionPasajeros(ninos, adultos, adultosMayores); }
}
