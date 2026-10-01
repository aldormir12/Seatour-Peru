package com.seatour.seatour.controller;

import com.seatour.seatour.dto.RecomendacionRespuesta;
import com.seatour.seatour.dto.PlanDiaRespuesta;
import com.seatour.seatour.model.ZonaMaritima;
import com.seatour.seatour.security.UsuarioPrincipal;
import com.seatour.seatour.service.IntelligenceService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/intelligence")
public class IntelligenceController {
    private final IntelligenceService intelligence;
    public IntelligenceController(IntelligenceService intelligence) { this.intelligence = intelligence; }

    @GetMapping("/recomendaciones")
    public List<RecomendacionRespuesta> recomendaciones(@AuthenticationPrincipal UsuarioPrincipal actor) {
        return intelligence.recomendar(actor.datos());
    }

    @GetMapping("/afinidades")
    public List<com.seatour.seatour.dto.AfinidadRespuesta> afinidades(@AuthenticationPrincipal UsuarioPrincipal actor) {
        return intelligence.afinidades(actor.datos());
    }

    @GetMapping("/plan-dia")
    public PlanDiaRespuesta planDia(@AuthenticationPrincipal UsuarioPrincipal actor,
            @RequestParam(name = "fecha", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
            @RequestParam(name = "zonaMaritima") ZonaMaritima zonaMaritima) {
        return intelligence.planDia(actor.datos(), fecha, zonaMaritima);
    }

    @GetMapping("/mejor-opcion")
    public com.seatour.seatour.dto.MejorOpcionRespuesta mejorOpcion(
            @AuthenticationPrincipal UsuarioPrincipal actor,
            @RequestParam(name = "fecha")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return intelligence.mejorOpcion(actor.datos(), fecha);
    }
}
