package com.seatour.seatour.controller;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.EstadoPago;
import com.seatour.seatour.security.UsuarioPrincipal;
import com.seatour.seatour.service.PlanReservaService;
import com.seatour.seatour.service.ReservaService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/intelligence/plan-dia/reserva")
public class PlanReservaController {
    private final ReservaService reservas;
    private final PlanReservaService planes;
    public PlanReservaController(ReservaService reservas, PlanReservaService planes) {
        this.reservas = reservas;
        this.planes = planes;
    }
    @PostMapping("/resumen")
    public PlanReservaResumen resumen(@Valid @RequestBody PlanReservaSeleccion datos,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        return reservas.resumenPlan(datos, actor.datos());
    }
    @PostMapping("/pagar")
    public PlanReservaPagoRespuesta pagar(@Valid @RequestBody PlanReservaPagoSolicitud datos,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        try {
            return planes.pagar(datos, actor.datos());
        } catch (PlanReservaService.PagoPlanRechazado e) {
            return new PlanReservaPagoRespuesta(EstadoPago.RECHAZADO,
                    e.getMessage() + ". No se creó ninguna reserva del plan; puedes modificarlo y reintentar.", List.of(), BigDecimal.ZERO);
        }
    }
}
