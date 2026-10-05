package com.seatour.seatour.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record ActualizarPreferenciasCliente(
        @Size(max = 100, message = "Selecciona como máximo 100 intereses")
        List<@NotNull(message = "Selecciona un interés válido") @Positive(message = "Selecciona un interés válido") Long> categoriasFavoritas,
        @PositiveOrZero(message = "El presupuesto no puede ser negativo")
        @Digits(integer = 17, fraction = 2, message = "Introduce un presupuesto válido con hasta dos decimales") BigDecimal presupuestoMaximo,
        @NotNull(message = "Selecciona tus horarios preferidos")
        @Size(min = 1, max = 2, message = "Selecciona uno o dos horarios")
        List<@NotBlank(message = "Selecciona un horario válido")
                @Pattern(regexp = "MANANA|MEDIODIA|TARDE|ATARDECER|CUALQUIERA", message = "Selecciona un horario válido") String> horarioPreferido,
        @Positive(message = "La duración debe ser mayor que cero") Integer duracionPreferidaMinutos,
        @Size(max = 100, message = "El nivel de actividad no puede superar los 100 caracteres") String nivelActividad,
        @Size(max = 100, message = "El tipo de grupo no puede superar los 100 caracteres") String tipoGrupo,
        @Size(max = 100, message = "Añade como máximo 100 prioridades")
        List<@NotBlank(message = "Las prioridades no pueden estar vacías")
                @Size(max = 255, message = "Cada prioridad puede tener hasta 255 caracteres") String> prioridades,
        @Size(max = 100, message = "Añade como máximo 100 restricciones")
        List<@NotBlank(message = "Las restricciones no pueden estar vacías")
                @Size(max = 255, message = "Cada restricción puede tener hasta 255 caracteres") String> restricciones) {
}
