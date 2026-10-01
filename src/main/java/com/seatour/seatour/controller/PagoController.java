package com.seatour.seatour.controller;
import com.seatour.seatour.dto.*;
import com.seatour.seatour.security.UsuarioPrincipal;
import com.seatour.seatour.service.PagoService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservas/{reservaId}/pagos")
public class PagoController {
    private final PagoService pagos;
    public PagoController(PagoService pagos) { this.pagos = pagos; }
    @PostMapping
    public PagoRespuesta pagar(@PathVariable Long reservaId, @RequestBody PagoSolicitud datos,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        return pagos.pagar(reservaId, datos, actor.datos());
    }
}
