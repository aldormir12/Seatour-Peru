package com.seatour.seatour.controller;

import com.seatour.seatour.model.CategoriaTour;
import com.seatour.seatour.service.CategoriaTourService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categorias")
public class CategoriaTourController {

    private final CategoriaTourService categoriaTourService;

    public CategoriaTourController(CategoriaTourService categoriaTourService) {
        this.categoriaTourService = categoriaTourService;
    }

    @GetMapping
    public ResponseEntity<List<CategoriaTour>> listarCategorias() {
        return ResponseEntity.ok(categoriaTourService.listarTodos());
    }

    @PostMapping
    public ResponseEntity<CategoriaTour> registrarCategoria(
            @Valid @RequestBody CategoriaTour categoriaTour) {

        CategoriaTour categoriaGuardada = categoriaTourService.guardar(categoriaTour);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(categoriaGuardada);
    }
}