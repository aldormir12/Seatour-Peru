package com.seatour.seatour.dto;

import com.seatour.seatour.model.Resena;
import java.time.Instant;

public record ResenaRespuesta(Long id, Long tourId, int puntuacion, String comentario, Instant creadaEn) {
    public static ResenaRespuesta desde(Resena resena) {
        return new ResenaRespuesta(resena.getId(), resena.getTour().getId(),
                resena.getPuntuacion(), resena.getComentario(), resena.getCreadaEn());
    }
}
