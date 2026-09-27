package com.seatour.seatour.controller;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.service.TourService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class TourController {
    private final TourService tours;

    public TourController(TourService tours) {
        this.tours = tours;
    }

    @GetMapping("/api/tours")
    public List<TourRespuesta> listarActivos() {
        return tours.listarActivos();
    }

    @GetMapping("/api/admin/tours")
    public List<TourRespuesta> listarTodos() {
        return tours.listarTodos();
    }

    @PostMapping("/api/admin/tours")
    @ResponseStatus(HttpStatus.CREATED)
    public TourRespuesta crear(@Valid @RequestBody TourCreacion datos) {
        return tours.crear(datos);
    }

    @PutMapping("/api/admin/tours/{id}")
    public TourRespuesta actualizar(@PathVariable Long id, @Valid @RequestBody TourActualizacion datos) {
        return tours.actualizar(id, datos);
    }

    @PatchMapping("/api/admin/tours/{id}/estado")
    public TourRespuesta cambiarEstado(@PathVariable Long id, @Valid @RequestBody TourEstado datos) {
        return tours.cambiarEstado(id, datos);
    }

    @DeleteMapping("/api/admin/tours/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        tours.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
