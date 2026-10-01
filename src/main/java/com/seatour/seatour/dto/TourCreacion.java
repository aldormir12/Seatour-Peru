package com.seatour.seatour.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import com.seatour.seatour.model.ZonaMaritima;

public record TourCreacion(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 255, message = "El nombre debe tener entre 2 y 255 caracteres") String nombre,
        @NotBlank(message = "La descripcion es obligatoria")
        @Size(max = 1000, message = "La descripcion no puede superar los 1000 caracteres") String descripcion,
        @NotNull(message = "La duración es obligatoria.")
        @Min(value = 30, message = "Duración entre 30 y 720 minutos.")
        @Max(value = 720, message = "Duración entre 30 y 720 minutos.") Integer duracionMinutos,
        @NotNull(message = "El precio es obligatorio.")
        @DecimalMin(value = "1.00", message = "Precio entre S/ 1.00 y S/ 10,000.00.")
        @DecimalMax(value = "10000.00", message = "Precio entre S/ 1.00 y S/ 10,000.00.")
        @Digits(integer = 8, fraction = 2, message = "El precio admite como máximo 2 decimales.") BigDecimal precioBase,
        @NotNull Boolean activo,
        @NotNull @Positive Long categoriaId,
        @NotBlank(message = "La imagen principal es obligatoria.")
        @Size(max = 2048) String imagenUrl,
        @NotNull(message = "La ubicación es obligatoria.") ZonaMaritima zonaMaritima) {
    public TourCreacion {
        nombre = CategoriaTourCreacion.normalizarNombre(nombre);
        descripcion = CategoriaTourCreacion.limpiarEspacios(descripcion);
        imagenUrl = imagenUrl == null ? null : imagenUrl.trim();
    }
}
