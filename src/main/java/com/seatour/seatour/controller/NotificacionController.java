package com.seatour.seatour.controller;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.security.UsuarioPrincipal;
import com.seatour.seatour.service.NotificacionService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {
    private final NotificacionService notificaciones;
    public NotificacionController(NotificacionService notificaciones) { this.notificaciones = notificaciones; }

    @GetMapping
    public NotificacionesPaginaRespuesta listar(@AuthenticationPrincipal UsuarioPrincipal actor,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "20") int tamanio) {
        return notificaciones.listar(actor.datos(), pagina, tamanio);
    }

    @GetMapping("/no-leidas/contador")
    public NotificacionesContadorRespuesta contar(@AuthenticationPrincipal UsuarioPrincipal actor) {
        return notificaciones.contarNoLeidas(actor.datos());
    }

    @PatchMapping("/{id}/leida")
    public NotificacionRespuesta marcarLeida(@PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        return notificaciones.marcarLeida(id, actor.datos());
    }

    @PatchMapping("/leidas")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void marcarTodasLeidas(@AuthenticationPrincipal UsuarioPrincipal actor) {
        notificaciones.marcarTodasLeidas(actor.datos());
    }
}
