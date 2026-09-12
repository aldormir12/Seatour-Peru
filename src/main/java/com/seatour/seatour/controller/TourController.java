package com.seatour.seatour.controller;

import com.seatour.seatour.model.Tour;
import com.seatour.seatour.service.TourService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tours")
public class TourController {

    private final TourService tourService;

    public TourController(TourService tourService) {
        this.tourService = tourService;
    }

    @GetMapping
    public ResponseEntity<List<Tour>> listarTours() {
        return ResponseEntity.ok(tourService.listarTodos());
    }

    @PostMapping
    public ResponseEntity<Tour> registrarTour(@Valid @RequestBody Tour tour) {
        Tour tourGuardado = tourService.guardar(tour);
        return ResponseEntity.status(HttpStatus.CREATED).body(tourGuardado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Tour> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody Tour tour) {

        Tour existente = tourService.buscarPorId(id)
                .orElseThrow(() -> new RuntimeException("Tour no encontrado"));
        existente.setNombre(tour.getNombre());
        existente.setDescripcion(tour.getDescripcion());
        existente.setDuracionMinutos(tour.getDuracionMinutos());
        existente.setPrecioBase(tour.getPrecioBase());
        existente.setActivo(tour.getActivo());
        existente.setCategoriaTour(tour.getCategoriaTour());

        Tour actualizado = tourService.guardar(existente);

        return ResponseEntity.ok(actualizado);
    }
}