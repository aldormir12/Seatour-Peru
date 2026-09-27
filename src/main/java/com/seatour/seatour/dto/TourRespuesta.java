package com.seatour.seatour.dto;

import com.seatour.seatour.model.Tour;
import java.math.BigDecimal;

public record TourRespuesta(Long id, String nombre, String descripcion, Integer duracionMinutos,
        BigDecimal precioBase, Boolean activo, Long categoriaId, String imagenUrl) {
    public static TourRespuesta desde(Tour tour) {
        return new TourRespuesta(tour.getId(), tour.getNombre(), tour.getDescripcion(),
                tour.getDuracionMinutos(), tour.getPrecioBase(), tour.getActivo(),
                tour.getCategoriaTour().getId(), tour.getImagenUrl());
    }
}
