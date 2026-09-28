package com.seatour.seatour.dto;

import jakarta.validation.constraints.*;
import java.text.Normalizer;
import java.util.Locale;

public record EmbarcacionSolicitud(
        @NotBlank(message = "El nombre es obligatorio") @Size(max = 255) String nombre,
        @NotBlank(message = "La matrícula es obligatoria") @Size(max = 255) String matricula,
        @NotBlank(message = "El tipo es obligatorio") @Size(max = 255) @Pattern(regexp = "LANCHA|LANCHA_RAPIDA|YATE|CATAMARAN|BOTE_PESCA|EMBARCACION_TURISTICA", message = "Tipo inválido. Valores permitidos: LANCHA, LANCHA_RAPIDA, YATE, CATAMARAN, BOTE_PESCA, EMBARCACION_TURISTICA") String tipo,
        @NotNull(message = "La capacidad es obligatoria") @Min(value = 1, message = "La capacidad debe estar entre 1 y 100 pasajeros") @Max(value = 100, message = "La capacidad debe estar entre 1 y 100 pasajeros") Integer capacidad,
        @NotNull(message = "El estado activo es obligatorio") Boolean activo,
        @NotBlank(message = "La imagen es obligatoria") @Size(max = 2048) String imagenUrl) {
    public EmbarcacionSolicitud {
        nombre = normalizar(nombre);
        matricula = normalizar(matricula);
        if (matricula != null)
            matricula = matricula.toUpperCase(Locale.ROOT);
        tipo = normalizar(tipo);
        imagenUrl = imagenUrl == null ? null : imagenUrl.strip();
    }

    private static String normalizar(String valor) {
        return valor == null ? null
                : CategoriaTourCreacion.limpiarEspacios(
                        Normalizer.normalize(valor, Normalizer.Form.NFC));
    }
}
