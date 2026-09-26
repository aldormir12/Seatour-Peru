package com.seatour.seatour.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ReservaCreacion(@NotNull @Positive Long salidaId, @NotNull @Positive Integer pasajeros,
        @Positive java.math.BigDecimal precioEsperado) {}
