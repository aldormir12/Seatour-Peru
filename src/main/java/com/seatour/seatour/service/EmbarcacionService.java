package com.seatour.seatour.service;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.Embarcacion;
import com.seatour.seatour.model.EstadoReserva;
import com.seatour.seatour.repository.EmbarcacionRepository;
import com.seatour.seatour.repository.SalidaProgramadaRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@Validated
@Transactional(readOnly = true)
public class EmbarcacionService {
    private final EmbarcacionRepository embarcaciones;
    private final SalidaProgramadaRepository salidas;
    private final ImagenEmbarcacionService imagenes;

    public EmbarcacionService(EmbarcacionRepository embarcaciones,
            SalidaProgramadaRepository salidas, ImagenEmbarcacionService imagenes) {
        this.embarcaciones = embarcaciones;
        this.salidas = salidas;
        this.imagenes = imagenes;
    }

    public List<EmbarcacionRespuesta> listar() {
        return embarcaciones.findAllByOrderByNombreAscIdAsc().stream()
                .map(EmbarcacionRespuesta::desde).toList();
    }

    @Transactional
    public EmbarcacionRespuesta crear(@Valid EmbarcacionSolicitud datos) {
        var embarcacion = new Embarcacion();
        aplicar(embarcacion, datos);
        return EmbarcacionRespuesta.desde(embarcaciones.saveAndFlush(embarcacion));
    }

    @Transactional
    public EmbarcacionRespuesta actualizar(Long id, @Valid EmbarcacionSolicitud datos) {
        var embarcacion = bloquear(id);
        if (embarcacion.getCapacidad() == null || datos.capacidad() < embarcacion.getCapacidad()) {
            var ahora = LocalDateTime.now(ZoneId.of("America/Lima"));
            if (salidas.contarSalidasQueExcedenCapacidad(id, ahora.toLocalDate(), ahora.toLocalTime(),
                    EstadoReserva.CANCELADA, datos.capacidad()) > 0) {
                throw conflicto("La capacidad no puede ser menor que los cupos disponibles más los pasajeros reservados de una salida futura, programada o en curso");
            }
        }
        aplicar(embarcacion, datos);
        return EmbarcacionRespuesta.desde(embarcaciones.saveAndFlush(embarcacion));
    }

    @Transactional
    public EmbarcacionRespuesta cambiarEstado(Long id, @Valid EmbarcacionEstado datos) {
        var embarcacion = bloquear(id);
        embarcacion.setActivo(datos.activo());
        return EmbarcacionRespuesta.desde(embarcaciones.saveAndFlush(embarcacion));
    }

    @Transactional
    public void eliminar(Long id) {
        var embarcacion = bloquear(id);
        if (salidas.existsByEmbarcacion_Id(id)) {
            throw conflicto("No se puede eliminar una embarcación con salidas asociadas");
        }
        embarcaciones.delete(embarcacion);
        embarcaciones.flush();
    }

    private Embarcacion bloquear(Long id) {
        return embarcaciones.bloquearPorId(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Embarcación no encontrada"));
    }

    private void aplicar(Embarcacion embarcacion, EmbarcacionSolicitud datos) {
        boolean duplicada = embarcacion.getId() == null
                ? embarcaciones.existsByMatriculaIgnoreCase(datos.matricula())
                : embarcaciones.existsByMatriculaIgnoreCaseAndIdNot(datos.matricula(), embarcacion.getId());
        if (duplicada) throw conflicto("Ya existe una embarcación con esa matrícula");
        imagenes.validarUrl(datos.imagenUrl());
        embarcacion.setNombre(datos.nombre());
        embarcacion.setMatricula(datos.matricula());
        embarcacion.setTipo(datos.tipo());
        embarcacion.setCapacidad(datos.capacidad());
        embarcacion.setActivo(datos.activo());
        embarcacion.setImagenUrl(datos.imagenUrl());
    }

    private static ResponseStatusException conflicto(String mensaje) {
        return new ResponseStatusException(HttpStatus.CONFLICT, mensaje);
    }
}
