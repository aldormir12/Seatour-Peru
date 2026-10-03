package com.seatour.seatour.dto;

import jakarta.validation.constraints.*;

public record ResenaCreacion(
        @NotNull(message = "La puntuación es obligatoria")
        @Min(value = 1, message = "La puntuación debe estar entre 1 y 5")
        @Max(value = 5, message = "La puntuación debe estar entre 1 y 5") Integer puntuacion,
        @Size(max = 2000, message = "El comentario no puede superar los 2000 caracteres") String comentario) {
    public ResenaCreacion {
        comentario = comentario == null || comentario.isBlank() ? null : comentario.strip();
    }
}
