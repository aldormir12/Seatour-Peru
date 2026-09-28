package com.seatour.seatour.controller;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.service.EmbarcacionService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/embarcaciones")
public class EmbarcacionController {
    private final EmbarcacionService embarcaciones;
    public EmbarcacionController(EmbarcacionService embarcaciones) { this.embarcaciones = embarcaciones; }

    @GetMapping
    public List<EmbarcacionRespuesta> listar() { return embarcaciones.listar(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EmbarcacionRespuesta crear(@Valid @RequestBody EmbarcacionSolicitud datos) {
        return embarcaciones.crear(datos);
    }

    @PutMapping("/{id}")
    public EmbarcacionRespuesta actualizar(@PathVariable Long id, @Valid @RequestBody EmbarcacionSolicitud datos) {
        return embarcaciones.actualizar(id, datos);
    }

    @PatchMapping("/{id}/estado")
    public EmbarcacionRespuesta cambiarEstado(@PathVariable Long id, @Valid @RequestBody EmbarcacionEstado datos) {
        return embarcaciones.cambiarEstado(id, datos);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        embarcaciones.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
