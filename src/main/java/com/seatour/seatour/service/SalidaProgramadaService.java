package com.seatour.seatour.service;

import com.seatour.seatour.model.Embarcacion;
import com.seatour.seatour.model.EstadoSalida;
import com.seatour.seatour.model.SalidaProgramada;
import com.seatour.seatour.model.Tour;
import com.seatour.seatour.repository.EmbarcacionRepository;
import com.seatour.seatour.repository.SalidaProgramadaRepository;
import com.seatour.seatour.repository.TourRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class SalidaProgramadaService {

    private final SalidaProgramadaRepository salidas;
    private final TourRepository tours;
    private final EmbarcacionRepository embarcaciones;

    public SalidaProgramadaService(
            SalidaProgramadaRepository salidas,
            TourRepository tours,
            EmbarcacionRepository embarcaciones) {
        this.salidas = salidas;
        this.tours = tours;
        this.embarcaciones = embarcaciones;
    }

    public List<SalidaProgramada> listarTodas() {
        return salidas.findAll();
    }

    public SalidaProgramada buscarPorId(Long id) {
        return salidas.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No existe una salida programada con id " + id));
    }

    public List<SalidaProgramada> listarPorTour(Long tourId) {
        validarExistenciaTour(tourId);

        return salidas
                .findByTourIdOrderByFechaAscHoraSalidaAsc(tourId);
    }

    public List<SalidaProgramada> listarDisponiblesPorTour(Long tourId) {
        validarExistenciaTour(tourId);

        return salidas.buscarSalidasDisponiblesPorTour(
                tourId,
                EstadoSalida.PROGRAMADA,
                LocalDate.now());
    }

    @Transactional
    public SalidaProgramada crear(SalidaProgramada salida) {

        validarSalida(salida);

        Tour tour = tours.findById(
                salida.getTour().getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "El tour indicado no existe"));

        Embarcacion embarcacion = embarcaciones.findById(
                salida.getEmbarcacion().getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "La embarcación indicada no existe"));

        validarCapacidad(
                salida.getCuposDisponibles(),
                embarcacion);

        salida.setTour(tour);
        salida.setEmbarcacion(embarcacion);

        return salidas.saveAndFlush(salida);
    }

    @Transactional
    public SalidaProgramada actualizar(
            Long id,
            SalidaProgramada datos) {

        SalidaProgramada existente = buscarPorId(id);

        validarSalida(datos);

        Tour tour = tours.findById(
                datos.getTour().getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "El tour indicado no existe"));

        Embarcacion embarcacion = embarcaciones.findById(
                datos.getEmbarcacion().getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "La embarcación indicada no existe"));

        validarCapacidad(
                datos.getCuposDisponibles(),
                embarcacion);

        existente.setFecha(
                datos.getFecha());

        existente.setHoraSalida(
                datos.getHoraSalida());

        existente.setCuposDisponibles(
                datos.getCuposDisponibles());

        existente.setEstado(
                datos.getEstado());

        existente.setTour(tour);

        existente.setEmbarcacion(
                embarcacion);

        return salidas.saveAndFlush(existente);
    }

    @Transactional
    public void eliminar(Long id) {

        SalidaProgramada salida = buscarPorId(id);

        salidas.delete(salida);
    }

    private void validarSalida(
            SalidaProgramada salida) {

        if (salida == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La salida programada es obligatoria");
        }

        if (salida.getFecha() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La fecha de salida es obligatoria");
        }

        if (salida.getHoraSalida() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La hora de salida es obligatoria");
        }

        if (salida.getCuposDisponibles() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Los cupos disponibles son obligatorios");
        }

        if (salida.getCuposDisponibles() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Los cupos disponibles no pueden ser negativos");
        }

        if (salida.getEstado() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El estado de la salida es obligatorio");
        }

        if (salida.getTour() == null ||
                salida.getTour().getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El tour es obligatorio");
        }

        if (salida.getEmbarcacion() == null ||
                salida.getEmbarcacion().getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La embarcación es obligatoria");
        }

        validarFechaYHora(
                salida.getFecha(),
                salida.getHoraSalida());
    }

    private void validarFechaYHora(
            LocalDate fecha,
            LocalTime hora) {

        LocalDate hoy = LocalDate.now();

        if (fecha.isBefore(hoy)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La fecha de salida no puede estar en el pasado");
        }

        if (fecha.equals(hoy) &&
                hora.isBefore(LocalTime.now())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La hora de salida no puede estar en el pasado");
        }
    }

    private void validarCapacidad(
            Integer cuposDisponibles,
            Embarcacion embarcacion) {

        if (embarcacion.getCapacidad() == null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La embarcación no tiene una capacidad válida");
        }

        if (cuposDisponibles > embarcacion.getCapacidad()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Los cupos disponibles no pueden superar la capacidad de la embarcación");
        }
    }

    private void validarExistenciaTour(
            Long tourId) {

        if (!tours.existsById(tourId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No existe un tour con id " + tourId);
        }
    }
}