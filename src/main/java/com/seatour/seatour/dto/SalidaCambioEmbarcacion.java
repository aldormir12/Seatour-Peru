package com.seatour.seatour.dto;

import jakarta.validation.constraints.*;

public record SalidaCambioEmbarcacion(
        @NotNull @Positive Long embarcacionId,
        @NotBlank @Pattern(regexp = "FALLA_TECNICA|SEGURIDAD_OPERATIVA",
                message = "El motivo debe ser FALLA_TECNICA o SEGURIDAD_OPERATIVA") String motivo) {}
