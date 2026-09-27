package com.seatour.seatour.controller;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.service.CategoriaTourService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
public class CategoriaTourController {
    private final CategoriaTourService categorias;

    public CategoriaTourController(CategoriaTourService categorias) {
        this.categorias = categorias;
    }

    @GetMapping("/api/categorias")
    public List<CategoriaTourRespuesta> listarActivas() {
        return categorias.listarActivas();
    }

    @GetMapping("/api/admin/categorias")
    public List<CategoriaTourRespuesta> listarTodas() {
        return categorias.listarTodas();
    }

    @PostMapping("/api/admin/categorias")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoriaTourRespuesta crear(@Valid @RequestBody CategoriaTourCreacion datos) {
        return categorias.crear(datos);
    }

    @PutMapping("/api/admin/categorias/{id}")
    public CategoriaTourRespuesta actualizar(@PathVariable Long id,
            @Valid @RequestBody CategoriaTourActualizacion datos) {
        return categorias.actualizar(id, datos);
    }

    @PatchMapping("/api/admin/categorias/{id}/estado")
    public CategoriaTourRespuesta cambiarEstado(@PathVariable Long id,
            @Valid @RequestBody CategoriaTourEstado datos) {
        return categorias.cambiarEstado(id, datos);
    }

    @DeleteMapping("/api/admin/categorias/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        categorias.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
