package com.seatour.seatour.controller;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.security.UsuarioPrincipal;
import com.seatour.seatour.service.ResenaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class ResenaController {
    private final ResenaService resenas;
    public ResenaController(ResenaService resenas) { this.resenas = resenas; }

    @PostMapping("/api/reservas/{reservaId}/resena")
    @ResponseStatus(HttpStatus.CREATED)
    public ResenaRespuesta crear(@PathVariable Long reservaId, @Valid @RequestBody ResenaCreacion datos,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        return resenas.crear(reservaId, datos, actor.datos());
    }

    @GetMapping("/api/tours/{tourId}/resenas")
    public ResenasTourRespuesta listar(@PathVariable Long tourId) {
        return resenas.listarPorTour(tourId);
    }
}
