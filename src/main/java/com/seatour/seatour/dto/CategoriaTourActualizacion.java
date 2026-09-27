package com.seatour.seatour.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoriaTourActualizacion(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 255, message = "El nombre debe tener entre 2 y 255 caracteres") String nombre,
        @Size(max = 255, message = "La descripcion no puede superar los 255 caracteres") String descripcion,
        @NotNull Boolean activo) {
    public CategoriaTourActualizacion {
        nombre = CategoriaTourCreacion.normalizarNombre(nombre);
        descripcion = CategoriaTourCreacion.limpiarEspacios(descripcion);
    }
}
