package com.seatour.seatour.controller;
import com.seatour.seatour.dto.*;
import com.seatour.seatour.service.AdicionalService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
public class AdicionalController {
    private final AdicionalService adicionales;
    public AdicionalController(AdicionalService adicionales) { this.adicionales = adicionales; }
    @GetMapping("/api/tours/{tourId}/adicionales")
    public List<AdicionalRespuesta> disponibles(@PathVariable Long tourId) { return adicionales.disponibles(tourId); }
    @GetMapping("/api/admin/adicionales")
    public List<AdicionalRespuesta> listar() { return adicionales.listar(); }
    @PutMapping("/api/admin/adicionales/{id}")
    public AdicionalRespuesta configurar(@PathVariable Long id, @Valid @RequestBody AdicionalSolicitud datos) {
        return adicionales.configurar(id, datos);
    }
}
