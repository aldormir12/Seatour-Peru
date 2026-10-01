package com.seatour.seatour.dto;

import com.seatour.seatour.model.Embarcacion;

public record EmbarcacionPublicaRespuesta(Long id, String nombre, String tipo,
        Integer capacidad, String imagenUrl) {
    public static EmbarcacionPublicaRespuesta desde(Embarcacion embarcacion) {
        return new EmbarcacionPublicaRespuesta(embarcacion.getId(), embarcacion.getNombre(),
                embarcacion.getTipo(), embarcacion.getCapacidad(), embarcacion.getImagenUrl());
    }
}
