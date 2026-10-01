package com.seatour.seatour.controller;

import com.seatour.seatour.dto.UsuarioCreacion;
import com.seatour.seatour.dto.UsuarioRespuesta;
import com.seatour.seatour.dto.UsuarioEstado;
import com.seatour.seatour.dto.OperadorEdicion;
import com.seatour.seatour.dto.OperadorPassword;
import com.seatour.seatour.security.UsuarioPrincipal;
import com.seatour.seatour.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarios;
    private final com.seatour.seatour.service.PreferenciasClienteService preferencias;

    public UsuarioController(
            UsuarioService usuarios, com.seatour.seatour.service.PreferenciasClienteService preferencias) {
        this.usuarios = usuarios;
        this.preferencias = preferencias;
    }

    @GetMapping("/me/preferencias")
    public com.seatour.seatour.dto.PreferenciasCliente consultarPreferencias(
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        return preferencias.consultar(actor.datos());
    }

    @PutMapping("/me/preferencias")
    public com.seatour.seatour.dto.PreferenciasCliente actualizarPreferencias(
            @AuthenticationPrincipal UsuarioPrincipal actor,
            @Valid @RequestBody com.seatour.seatour.dto.ActualizarPreferenciasCliente datos) {
        return preferencias.actualizar(actor.datos(), datos);
    }

    @GetMapping
    public ResponseEntity<List<UsuarioRespuesta>> listar() {
        return ResponseEntity.ok(
                usuarios.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioRespuesta> buscar(
            @PathVariable Long id) {
        return ResponseEntity.ok(
                usuarios.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<UsuarioRespuesta> crear(
            @Valid @RequestBody UsuarioCreacion datos) {

        UsuarioRespuesta usuario = usuarios.crear(datos);

        URI ubicacion = URI.create(
                "/api/usuarios/" + usuario.id());

        return ResponseEntity
                .created(ubicacion)
                .body(usuario);
    }

    @PostMapping("/operadores")
    public ResponseEntity<UsuarioRespuesta> crearOperador(
            @Valid @RequestBody UsuarioCreacion datos) {
        UsuarioRespuesta usuario = usuarios.crearOperador(datos);
        return ResponseEntity.created(URI.create("/api/usuarios/" + usuario.id())).body(usuario);
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<UsuarioRespuesta> cambiarEstado(
            @PathVariable Long id,
            @Valid @RequestBody UsuarioEstado datos,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        return ResponseEntity.ok(usuarios.cambiarEstado(id, datos, actor.datos().id()));
    }

    @PutMapping("/operadores/{id}")
    public ResponseEntity<UsuarioRespuesta> editarOperador(
            @PathVariable Long id, @Valid @RequestBody OperadorEdicion datos) {
        return ResponseEntity.ok(usuarios.editarOperador(id, datos));
    }

    @PatchMapping("/operadores/{id}/password")
    public ResponseEntity<Void> restablecerPasswordOperador(
            @PathVariable Long id, @Valid @RequestBody OperadorPassword datos) {
        usuarios.restablecerPasswordOperador(id, datos);
        return ResponseEntity.noContent().build();
    }
}
