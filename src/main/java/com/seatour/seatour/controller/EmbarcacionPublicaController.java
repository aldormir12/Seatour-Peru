package com.seatour.seatour.controller;

import com.seatour.seatour.dto.EmbarcacionPublicaRespuesta;
import com.seatour.seatour.service.EmbarcacionService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/embarcaciones")
public class EmbarcacionPublicaController {
    private final EmbarcacionService embarcaciones;

    public EmbarcacionPublicaController(EmbarcacionService embarcaciones) {
        this.embarcaciones = embarcaciones;
    }

    @GetMapping("/{id}")
    public EmbarcacionPublicaRespuesta consultar(@PathVariable Long id) {
        return embarcaciones.consultarPublica(id);
    }
}
