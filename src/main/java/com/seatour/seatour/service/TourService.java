package com.seatour.seatour.service;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.Tour;
import com.seatour.seatour.repository.CategoriaTourRepository;
import com.seatour.seatour.repository.SalidaProgramadaRepository;
import com.seatour.seatour.repository.TourRepository;
import com.seatour.seatour.repository.ResenaRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.math.RoundingMode;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Validated
@Transactional(readOnly = true)
public class TourService {
    private final TourRepository tours;
    private final CategoriaTourRepository categorias;
    private final SalidaProgramadaRepository salidas;
    private final AdicionalesBaseService adicionalesBase;
    private final ResenaRepository resenas;

    public TourService(TourRepository tours, CategoriaTourRepository categorias,
            SalidaProgramadaRepository salidas, AdicionalesBaseService adicionalesBase, ResenaRepository resenas) {
        this.tours = tours;
        this.categorias = categorias;
        this.salidas = salidas;
        this.adicionalesBase = adicionalesBase;
        this.resenas = resenas;
    }

    public List<TourRespuesta> listarActivos() {
        return respuestas(tours.findByActivoTrueOrderByNombreAsc());
    }

    public List<TourRespuesta> listarTodos() {
        return respuestas(tours.findAllByOrderByNombreAsc());
    }

    @Transactional
    public TourRespuesta crear(@Valid TourCreacion datos) {
        Tour tour = new Tour();
        tour.setZonaMaritima(datos.zonaMaritima());
        tour.setImagenUrl(datos.imagenUrl());
        aplicar(tour, datos.nombre(), datos.descripcion(), datos.duracionMinutos(),
                datos.precioBase(), datos.activo(), datos.categoriaId());
        tour = tours.saveAndFlush(tour);
        adicionalesBase.garantizarPara(List.of(tour));
        return TourRespuesta.desde(tour);
    }

    @Transactional
    public TourRespuesta actualizar(Long id, @Valid TourActualizacion datos) {
        Tour tour = buscar(id);
        tour.setZonaMaritima(datos.zonaMaritima());
        if (datos.imagenUrl() != null && !datos.imagenUrl().isBlank()) {
            tour.setImagenUrl(datos.imagenUrl());
        }
        aplicar(tour, datos.nombre(), datos.descripcion(), datos.duracionMinutos(),
                datos.precioBase(), datos.activo(), datos.categoriaId());
        return respuestas(List.of(tours.saveAndFlush(tour))).get(0);
    }

    @Transactional
    public TourRespuesta cambiarEstado(Long id, @Valid TourEstado datos) {
        Tour tour = buscar(id);
        tour.setActivo(datos.activo());
        return respuestas(List.of(tours.saveAndFlush(tour))).get(0);
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

    private List<TourRespuesta> respuestas(List<Tour> lista) {
        if (lista.isEmpty()) return List.of();
        // Una consulta agrupada para todo el listado, sin cargar las reseñas individuales.
        var resumenes = resenas.resumirPorTours(lista.stream().map(Tour::getId).toList()).stream()
                .collect(Collectors.toMap(ResenaRepository.ResumenTour::getTourId, Function.identity()));
        return lista.stream().map(tour -> {
            var resumen = resumenes.get(tour.getId());
            return resumen == null ? TourRespuesta.desde(tour) : TourRespuesta.desde(tour,
                    BigDecimal.valueOf(resumen.getPromedio()).setScale(2, RoundingMode.HALF_UP),
                    resumen.getCantidad());
        }).toList();
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
