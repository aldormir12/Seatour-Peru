package com.seatour.seatour.controller;

import com.seatour.seatour.dto.LoginSolicitud;
import com.seatour.seatour.dto.LoginTokenRespuesta;
import com.seatour.seatour.security.UsuarioPrincipal;
import com.seatour.seatour.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public LoginTokenRespuesta login(@Valid @RequestBody LoginSolicitud datos) {
        var autenticacion = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(datos.correo(), datos.password()));
        var usuario = (UsuarioPrincipal) autenticacion.getPrincipal();
        return LoginTokenRespuesta.desde(usuario.datos(), jwtService.generarToken(usuario));
    }

    @GetMapping("/me")
    public com.seatour.seatour.dto.LoginRespuesta sesion(
            org.springframework.security.core.Authentication autenticacion) {
        return ((UsuarioPrincipal) autenticacion.getPrincipal()).datos();
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, String>> autenticacionFallida() {
        return ResponseEntity.status(401).body(Map.of("mensaje", "Credenciales invalidas"));
    }
}
