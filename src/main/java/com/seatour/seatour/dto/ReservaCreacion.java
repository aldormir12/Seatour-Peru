package com.seatour.seatour.dto;
import jakarta.validation.constraints.*;
public record ReservaCreacion(@NotNull @Positive Long salidaId,
        @NotNull @Min(0) @Max(100) Integer ninos,
        @NotNull @Min(0) @Max(100) Integer adultos,
        @NotNull @Min(0) @Max(100) Integer adultosMayores,
        @Positive java.math.BigDecimal precioEsperado,
        @Size(max = 50) java.util.List<@NotNull @Positive Long> adicionalesIds) {
    public int totalPasajeros() { return ninos + adultos + adultosMayores; }
}
