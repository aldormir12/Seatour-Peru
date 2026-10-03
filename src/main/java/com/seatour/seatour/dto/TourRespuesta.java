package com.seatour.seatour.dto;

import com.seatour.seatour.model.Tour;
import com.seatour.seatour.model.ZonaMaritima;
import java.math.BigDecimal;

public record TourRespuesta(Long id, String nombre, String descripcion, Integer duracionMinutos,
        BigDecimal precioBase, Boolean activo, Long categoriaId, String imagenUrl, ZonaMaritima zonaMaritima,
        BigDecimal promedioEstrellas, long cantidadResenas) {
    public static TourRespuesta desde(Tour tour) {
        return desde(tour, null, 0);
    }

    public static TourRespuesta desde(Tour tour, BigDecimal promedioEstrellas, long cantidadResenas) {
        return new TourRespuesta(tour.getId(), tour.getNombre(), tour.getDescripcion(),
                tour.getDuracionMinutos(), tour.getPrecioBase(), tour.getActivo(),
                tour.getCategoriaTour().getId(), tour.getImagenUrl(), tour.getZonaMaritima(),
                promedioEstrellas, cantidadResenas);
    }
}
