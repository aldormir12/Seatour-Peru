package com.seatour.seatour.dto;

import com.seatour.seatour.model.Notificacion;
import java.time.Instant;

public record NotificacionRespuesta(Long id, String tipo, String titulo, String mensaje,
        Instant creadaEn, boolean leida, Instant leidaEn) {
    public static NotificacionRespuesta desde(Notificacion notificacion) {
        return new NotificacionRespuesta(notificacion.getId(), notificacion.getTipo(),
                notificacion.getTitulo(), notificacion.getMensaje(), notificacion.getCreadaEn(),
                notificacion.isLeida(), notificacion.getLeidaEn());
    }
}
