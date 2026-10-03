package com.seatour.seatour.service;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.*;
import com.seatour.seatour.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@Transactional(readOnly = true)
public class ResenaService {
    private final ResenaRepository resenas;
    private final ReservaRepository reservas;
    private final TourRepository tours;

    public ResenaService(ResenaRepository resenas, ReservaRepository reservas, TourRepository tours) {
        this.resenas = resenas;
        this.reservas = reservas;
        this.tours = tours;
    }

    @Transactional
    public ResenaRespuesta crear(Long reservaId, ResenaCreacion datos, LoginRespuesta actor) {
        if (actor == null || !"CLIENTE".equals(actor.rol()))
            throw error(HttpStatus.FORBIDDEN, "Solo un cliente puede publicar una reseña");
        validarId(reservaId);
        // El bloqueo serializa publicaciones concurrentes para la misma reserva.
        var reserva = reservas.bloquearPorId(reservaId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Reserva no encontrada"));
        if (!reserva.getCliente().getId().equals(actor.id()))
            throw error(HttpStatus.NOT_FOUND, "Reserva no encontrada");
        if (reserva.getEstado() != EstadoReserva.CONFIRMADA)
            throw error(HttpStatus.CONFLICT, "Solo se puede reseñar una reserva confirmada");
        if (reserva.getSalida().getEstado() != EstadoSalida.COMPLETADA)
            throw error(HttpStatus.CONFLICT, "La salida debe estar completada para publicar una reseña");
        if (resenas.existsByReserva_Id(reservaId))
            throw error(HttpStatus.CONFLICT, "Esta reserva ya tiene una reseña");
        if (datos == null || datos.puntuacion() == null || datos.puntuacion() < 1 || datos.puntuacion() > 5)
            throw error(HttpStatus.BAD_REQUEST, "La puntuación debe estar entre 1 y 5");
        if (datos.comentario() != null && datos.comentario().length() > 2000)
            throw error(HttpStatus.BAD_REQUEST, "El comentario no puede superar los 2000 caracteres");
        return ResenaRespuesta.desde(resenas.saveAndFlush(
                new Resena(reserva, datos.puntuacion(), datos.comentario())));
    }

    public ResenasTourRespuesta listarPorTour(Long tourId) {
        validarId(tourId);
        if (!tours.existsById(tourId)) throw error(HttpStatus.NOT_FOUND, "Tour no encontrado");
        var lista = resenas.findByTour_IdOrderByCreadaEnDescIdDesc(tourId);
        BigDecimal promedio = lista.isEmpty() ? null : BigDecimal.valueOf(
                lista.stream().mapToLong(Resena::getPuntuacion).sum())
                .divide(BigDecimal.valueOf(lista.size()), 2, RoundingMode.HALF_UP);
        return new ResenasTourRespuesta(tourId, promedio, lista.size(),
                lista.stream().map(ResenaRespuesta::desde).toList());
    }

    private void validarId(Long id) {
        if (id == null || id <= 0) throw error(HttpStatus.BAD_REQUEST, "El identificador debe ser positivo");
    }
    private ResponseStatusException error(HttpStatus estado, String mensaje) {
        return new ResponseStatusException(estado, mensaje);
    }
}
