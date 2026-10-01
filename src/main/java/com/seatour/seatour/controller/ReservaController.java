package com.seatour.seatour.controller;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.security.UsuarioPrincipal;
import com.seatour.seatour.service.ReservaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/reservas")
public class ReservaController {
    private final ReservaService reservas;
    private final com.seatour.seatour.service.TarifasPasajerosService tarifas;
    public ReservaController(ReservaService reservas, com.seatour.seatour.service.TarifasPasajerosService tarifas) {
        this.reservas = reservas; this.tarifas = tarifas;
    }
    @GetMapping("/tarifas")
    public List<TarifaPasajeroRespuesta> tarifas() { return tarifas.listar(); }
    @PostMapping
    public ResponseEntity<ReservaRespuesta> crear(@Valid @RequestBody ReservaCreacion datos,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        var reserva = reservas.crear(datos, actor.datos());
        return ResponseEntity.created(URI.create("/api/reservas/" + reserva.id())).body(reserva);
    }
    @GetMapping
    public List<ReservaRespuesta> gestion(@AuthenticationPrincipal UsuarioPrincipal actor) {
        return reservas.listar(actor.datos(), false);
    }
    @GetMapping("/mis-reservas")
    public List<ReservaRespuesta> mias(@AuthenticationPrincipal UsuarioPrincipal actor) {
        return reservas.listar(actor.datos(), true);
    }
    @GetMapping("/{id}")
    public ReservaRespuesta consultar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal actor) {
        return reservas.consultar(id, actor.datos());
    }
    @PostMapping("/{id}/confirmar")
    public ReservaRespuesta confirmar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal actor) {
        return reservas.confirmar(id, actor.datos());
    }
    @PostMapping("/{id}/cancelar")
    public ReservaRespuesta cancelar(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal actor) {
        return reservas.cancelar(id, actor.datos());
    }
}
