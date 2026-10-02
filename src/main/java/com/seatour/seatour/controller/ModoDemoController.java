package com.seatour.seatour.controller;

import com.seatour.seatour.security.UsuarioPrincipal;
import com.seatour.seatour.service.ModoDemoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/modo-demo")
public class ModoDemoController {
    private final ModoDemoService modo;
    public ModoDemoController(ModoDemoService modo) { this.modo = modo; }
    public record Estado(boolean activo) {}
    public record Cambio(@NotNull Boolean activo) {}
    @GetMapping
    public Estado consultar() { return new Estado(modo.activo()); }
    @PutMapping
    public Estado cambiar(@Valid @RequestBody Cambio datos,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        return new Estado(modo.cambiar(datos.activo(), actor == null ? null : actor.datos()));
    }
}
