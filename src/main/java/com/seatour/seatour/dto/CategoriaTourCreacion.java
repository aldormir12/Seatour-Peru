package com.seatour.seatour.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoriaTourCreacion(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 255, message = "El nombre debe tener entre 2 y 255 caracteres") String nombre,
        @Size(max = 255, message = "La descripcion no puede superar los 255 caracteres") String descripcion,
        @NotNull Boolean activo) {
    public CategoriaTourCreacion {
        nombre = CategoriaTourCreacion.normalizarNombre(nombre);
        descripcion = limpiarEspacios(descripcion);
    }

    public static String normalizarNombre(String nombre) {
        String limpio = limpiarEspacios(nombre);
        if (limpio == null) return null;
        var letra = java.util.regex.Pattern.compile("\\p{L}").matcher(limpio);
        if (!letra.find()) return limpio;
        return limpio.substring(0, letra.start())
                + letra.group().toUpperCase(java.util.Locale.ROOT)
                + limpio.substring(letra.end());
    }

    public static String limpiarEspacios(String texto) {
        return texto == null ? null : texto.replaceAll("[\\s\\p{Z}\\uFEFF]+", " ").trim();
    }
}
