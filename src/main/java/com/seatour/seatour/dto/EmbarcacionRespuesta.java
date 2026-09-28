package com.seatour.seatour.dto;

import com.seatour.seatour.model.Embarcacion;

public record EmbarcacionRespuesta(Long id, String nombre, String matricula, String tipo,
        Integer capacidad, Boolean activo, String imagenUrl) {
    public static EmbarcacionRespuesta desde(Embarcacion embarcacion) {
        return new EmbarcacionRespuesta(embarcacion.getId(), embarcacion.getNombre(),
                embarcacion.getMatricula(), embarcacion.getTipo(), embarcacion.getCapacidad(),
                embarcacion.getActivo(), embarcacion.getImagenUrl());
    }
}
