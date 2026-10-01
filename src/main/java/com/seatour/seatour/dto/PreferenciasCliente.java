package com.seatour.seatour.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record PreferenciasCliente(
        @Size(max = 100) List<@NotNull @Positive Long> categoriasFavoritas,
        @PositiveOrZero @Digits(integer = 17, fraction = 2) BigDecimal presupuestoMaximo,
        List<String> horarioPreferido,
        @Positive Integer duracionPreferidaMinutos,
        @Size(max = 100) String nivelActividad,
        @Size(max = 100) String tipoGrupo,
        @Size(max = 100) List<@NotBlank @Size(max = 255) String> prioridades,
        @Size(max = 100) List<@NotBlank @Size(max = 255) String> restricciones,
        @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
        boolean preferenciasConfiguradas) {
}
