package com.seatour.seatour.controller;

import com.seatour.seatour.dto.LoginSolicitud;
import com.seatour.seatour.dto.LoginTokenRespuesta;
import com.seatour.seatour.security.UsuarioPrincipal;
import com.seatour.seatour.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import com.seatour.seatour.service.LoginProtegidoService;
import com.seatour.seatour.security.LoginBloqueadoException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final LoginProtegidoService loginProtegido;
    private final JwtService jwtService;

    public AuthController(LoginProtegidoService loginProtegido, JwtService jwtService) {
        this.loginProtegido = loginProtegido;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public LoginTokenRespuesta login(@Valid @RequestBody LoginSolicitud datos) {
        var usuario = loginProtegido.autenticar(datos.correo(), datos.password());
        return LoginTokenRespuesta.desde(usuario.datos(), jwtService.generarToken(usuario));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(org.springframework.http.HttpHeaders.AUTHORIZATION) String authorization) {
        // El filtro ya verificó firma, fechas, usuario y revocación del Bearer.
        jwtService.revocarToken(authorization.substring(7));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public com.seatour.seatour.dto.LoginRespuesta sesion(
            org.springframework.security.core.Authentication autenticacion) {
        return ((UsuarioPrincipal) autenticacion.getPrincipal()).datos();
    }

    @ExceptionHandler(LoginBloqueadoException.class)
    public ResponseEntity<Map<String, String>> loginBloqueado() {
        return ResponseEntity.status(429).header("Retry-After", "900")
                .body(Map.of("mensaje", "Inicio de sesión temporalmente bloqueado. Espera 15 minutos antes de volver a intentarlo."));
    }

    @ExceptionHandler({AuthenticationException.class, org.springframework.security.oauth2.jwt.JwtException.class})
    public ResponseEntity<Map<String, String>> autenticacionFallida() {
        return ResponseEntity.status(401).body(Map.of("mensaje", "Credenciales invalidas"));
    }
}
