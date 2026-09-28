package com.seatour.seatour.service;

import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Límite inclusivo por fecha local, compartido por programación y reservas. */
public final class HorizonteOperativo {
    private static final ZoneId ZONA = ZoneId.of("America/Lima");
    private static final int DIAS = 45;

    private HorizonteOperativo() {}

    public static void validar(LocalDate fechaSalida) {
        if (fechaSalida == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha de salida es obligatoria");
        }
        LocalDate maxima = LocalDate.now(ZONA).plusDays(DIAS);
        if (fechaSalida.isAfter(maxima)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La salida supera el horizonte operativo de 45 días. Fecha máxima permitida: "
                            + maxima + " (America/Lima)");
        }
    }
}
