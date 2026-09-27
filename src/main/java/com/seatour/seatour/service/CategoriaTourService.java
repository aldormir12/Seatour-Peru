package com.seatour.seatour.service;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.CategoriaTour;
import com.seatour.seatour.repository.CategoriaTourRepository;
import com.seatour.seatour.repository.TourRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class CategoriaTourService {
    private final CategoriaTourRepository categorias;
    private final TourRepository tours;

    public CategoriaTourService(CategoriaTourRepository categorias, TourRepository tours) {
        this.categorias = categorias;
        this.tours = tours;
    }

    public List<CategoriaTourRespuesta> listarActivas() {
        return categorias.findByActivoTrueOrderByNombreAsc().stream()
                .map(CategoriaTourRespuesta::desde).toList();
    }

    public List<CategoriaTourRespuesta> listarTodas() {
        return categorias.findAllByOrderByNombreAsc().stream()
                .map(CategoriaTourRespuesta::desde).toList();
    }

    @Transactional
    public CategoriaTourRespuesta crear(CategoriaTourCreacion datos) {
        CategoriaTour categoria = new CategoriaTour();
        aplicar(categoria, datos.nombre(), datos.descripcion(), datos.activo());
        return CategoriaTourRespuesta.desde(categorias.saveAndFlush(categoria));
    }

    @Transactional
    public CategoriaTourRespuesta actualizar(Long id, CategoriaTourActualizacion datos) {
        CategoriaTour categoria = buscar(id);
        aplicar(categoria, datos.nombre(), datos.descripcion(), datos.activo());
        return CategoriaTourRespuesta.desde(categorias.saveAndFlush(categoria));
    }

    @Transactional
    public CategoriaTourRespuesta cambiarEstado(Long id, CategoriaTourEstado datos) {
        CategoriaTour categoria = buscar(id);
        categoria.setActivo(datos.activo());
        return CategoriaTourRespuesta.desde(categorias.saveAndFlush(categoria));
    }

    @Transactional
    public void eliminar(Long id) {
        CategoriaTour categoria = buscar(id);
        if (tours.existsByCategoriaTour_Id(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede eliminar una categoria con tours asociados");
        }
        categorias.delete(categoria);
        categorias.flush();
    }

    private CategoriaTour buscar(Long id) {
        return categorias.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Categoria no encontrada"));
    }

    private void aplicar(CategoriaTour categoria, String nombre, String descripcion, Boolean activo) {
        String normalizado = CategoriaTourCreacion.normalizarNombre(nombre);
        descripcion = CategoriaTourCreacion.limpiarEspacios(descripcion);
        if (normalizado == null || normalizado.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre es obligatorio");
        }
        if (normalizado.length() < 2 || normalizado.length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El nombre debe tener entre 2 y 255 caracteres");
        }
        if (descripcion != null && descripcion.length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La descripcion no puede superar los 255 caracteres");
        }
        boolean duplicado = categoria.getId() == null
                ? categorias.existsByNombreIgnoreCase(normalizado)
                : categorias.existsByNombreIgnoreCaseAndIdNot(normalizado, categoria.getId());
        if (duplicado) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya existe una categoria con ese nombre");
        }
        categoria.setNombre(normalizado);
        categoria.setDescripcion(descripcion);
        categoria.setActivo(activo);
    }
}
