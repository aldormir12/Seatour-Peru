package com.seatour.seatour.controller;

import com.seatour.seatour.dto.LiveSalidaRespuesta;
import com.seatour.seatour.dto.LiveTokenRespuesta;
import com.seatour.seatour.security.UsuarioPrincipal;
import com.seatour.seatour.service.LiveService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/live/salidas")
public class LiveController {
    private final LiveService live;

    public LiveController(LiveService live) { this.live = live; }

    @GetMapping
    public List<LiveSalidaRespuesta> listar(@AuthenticationPrincipal UsuarioPrincipal actor) {
        return live.listar(actor.datos());
    }

    @PostMapping("/{id}/token")
    public ResponseEntity<LiveTokenRespuesta> token(@PathVariable("id") Long id,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(live.token(actor.datos(), id));
    }
}
