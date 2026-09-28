package com.seatour.seatour.service;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.Tour;
import com.seatour.seatour.repository.CategoriaTourRepository;
import com.seatour.seatour.repository.SalidaProgramadaRepository;
import com.seatour.seatour.repository.TourRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
@Validated
@Transactional(readOnly = true)
public class TourService {
    private final TourRepository tours;
    private final CategoriaTourRepository categorias;
    private final SalidaProgramadaRepository salidas;

    public TourService(TourRepository tours, CategoriaTourRepository categorias,
            SalidaProgramadaRepository salidas) {
        this.tours = tours;
        this.categorias = categorias;
        this.salidas = salidas;
    }

    public List<TourRespuesta> listarActivos() {
        return tours.findByActivoTrueOrderByNombreAsc().stream().map(TourRespuesta::desde).toList();
    }

    public List<TourRespuesta> listarTodos() {
        return tours.findAllByOrderByNombreAsc().stream().map(TourRespuesta::desde).toList();
    }

    @Transactional
    public TourRespuesta crear(@Valid TourCreacion datos) {
        Tour tour = new Tour();
        tour.setImagenUrl(datos.imagenUrl());
        aplicar(tour, datos.nombre(), datos.descripcion(), datos.duracionMinutos(),
                datos.precioBase(), datos.activo(), datos.categoriaId());
        return TourRespuesta.desde(tours.saveAndFlush(tour));
    }

    @Transactional
    public TourRespuesta actualizar(Long id, @Valid TourActualizacion datos) {
        Tour tour = buscar(id);
        if (datos.imagenUrl() != null && !datos.imagenUrl().isBlank()) {
            tour.setImagenUrl(datos.imagenUrl());
        }
        aplicar(tour, datos.nombre(), datos.descripcion(), datos.duracionMinutos(),
                datos.precioBase(), datos.activo(), datos.categoriaId());
        return TourRespuesta.desde(tours.saveAndFlush(tour));
    }

    @Transactional
    public TourRespuesta cambiarEstado(Long id, @Valid TourEstado datos) {
        Tour tour = buscar(id);
        tour.setActivo(datos.activo());
        return TourRespuesta.desde(tours.saveAndFlush(tour));
    }

    @Transactional
    public void eliminar(Long id) {
        Tour tour = buscar(id);
        if (salidas.existsByTour_Id(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede eliminar un tour con salidas asociadas");
        }
        tours.delete(tour);
        tours.flush();
    }

    private Tour buscar(Long id) {
        return tours.bloquearPorId(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Tour no encontrado"));
    }

    private void aplicar(Tour tour, String nombre, String descripcion, Integer duracionMinutos,
            BigDecimal precioBase, Boolean activo, Long categoriaId) {
        if (tour.getId() != null && !java.util.Objects.equals(tour.getDuracionMinutos(), duracionMinutos)
                && salidas.existsByTour_Id(tour.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede cambiar la duración de un tour con salidas asociadas; alteraría sus horarios e historial");
        }
        String normalizado = CategoriaTourCreacion.normalizarNombre(nombre);
        boolean duplicado = tour.getId() == null
                ? tours.existsByNombreIgnoreCase(normalizado)
                : tours.existsByNombreIgnoreCaseAndIdNot(normalizado, tour.getId());
        if (duplicado) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya existe un tour con ese nombre");
        }
        var categoria = categorias.findById(categoriaId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoria no encontrada"));
        boolean conservaCategoria = tour.getId() != null && tour.getCategoriaTour() != null
                && categoriaId.equals(tour.getCategoriaTour().getId());
        if (!Boolean.TRUE.equals(categoria.getActivo()) && !conservaCategoria) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede asignar una categoria inactiva");
        }
        tour.setNombre(normalizado);
        tour.setDescripcion(CategoriaTourCreacion.limpiarEspacios(descripcion));
        tour.setDuracionMinutos(duracionMinutos);
        tour.setPrecioBase(precioBase);
        tour.setActivo(activo);
        tour.setCategoriaTour(categoria);
    }
}
