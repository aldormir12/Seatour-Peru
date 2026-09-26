package com.seatour.seatour.controller;

import com.seatour.seatour.dto.UsuarioCreacion;
import com.seatour.seatour.dto.UsuarioRespuesta;
import com.seatour.seatour.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarios;

    public UsuarioController(
            UsuarioService usuarios) {
        this.usuarios = usuarios;
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
}