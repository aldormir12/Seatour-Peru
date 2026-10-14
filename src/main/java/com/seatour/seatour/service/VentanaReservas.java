package com.seatour.seatour.service;

import com.seatour.seatour.model.SalidaProgramada;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Exclusivamente para nuevas reservas; no cierra pagos ni modificaciones existentes. */
public final class VentanaReservas {
    private static final ZoneId ZONA = ZoneId.of("America/Lima");
    private VentanaReservas() {}
    public static boolean abierta(SalidaProgramada salida) {
        return !salida.isEsDemo() && LocalDateTime.of(salida.getFecha(), salida.getHoraSalida())
                .isAfter(LocalDateTime.now(ZONA).plusHours(2));
    }
    public static void validar(SalidaProgramada salida) {
        if (!abierta(salida)) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Las nuevas reservas cierran 2 horas antes del inicio de la salida (hora de Perú)");
    }
}
