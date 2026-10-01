package com.seatour.seatour.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record ActualizarPreferenciasCliente(
        @Size(max = 100) List<@NotNull @Positive Long> categoriasFavoritas,
        @PositiveOrZero @Digits(integer = 17, fraction = 2) BigDecimal presupuestoMaximo,
        @NotNull @Size(min = 1, max = 2) List<@NotBlank @Pattern(regexp = "MANANA|MEDIODIA|TARDE|ATARDECER|CUALQUIERA") String> horarioPreferido,
        @Positive Integer duracionPreferidaMinutos,
        @Size(max = 100) String nivelActividad,
        @Size(max = 100) String tipoGrupo,
        @Size(max = 100) List<@NotBlank @Size(max = 255) String> prioridades,
        @Size(max = 100) List<@NotBlank @Size(max = 255) String> restricciones) {
}
