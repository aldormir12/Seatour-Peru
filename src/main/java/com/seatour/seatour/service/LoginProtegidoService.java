package com.seatour.seatour.service;

import com.seatour.seatour.repository.IntentoLoginRepository;
import com.seatour.seatour.model.IntentoLogin;
import com.seatour.seatour.security.LoginBloqueadoException;
import com.seatour.seatour.security.UsuarioPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class LoginProtegidoService {
    private final IntentoLoginRepository intentos;
    private final AuthenticationManager authenticationManager;

    public LoginProtegidoService(IntentoLoginRepository intentos, AuthenticationManager authenticationManager) {
        this.intentos = intentos;
        this.authenticationManager = authenticationManager;
    }

    // Un fallo de credenciales debe COMMITIR los contadores, no deshacerlos.
    @Transactional(noRollbackFor = AuthenticationException.class)
    public UsuarioPrincipal autenticar(String correo, String password) {
        String normalizado = correo.trim().toLowerCase(Locale.ROOT);
        // El túnel puede agrupar visitantes: la protección se aplica únicamente por cuenta.
        Instant ahora = Instant.now();
        IntentoLogin cuenta = obtener("cuenta:" + digest(normalizado), ahora);
        ahora = Instant.now();
        cuenta.actualizarPlazo(ahora);
        cuenta.registrarActividad(ahora);
        if (cuenta.bloqueado(ahora)) {
            throw new LoginBloqueadoException();
        }
        try {
            var autenticacion = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(normalizado, password));
            var principal = (UsuarioPrincipal) autenticacion.getPrincipal();
            cuenta.reiniciar(Instant.now());
            return principal;
        } catch (AuthenticationException error) {
            ahora = Instant.now();
            cuenta.fallo(ahora, 5);
            if (cuenta.bloqueado(ahora)) throw new LoginBloqueadoException();
            // No propagar motivos (cuenta desactivada, inexistente, etc.).
            throw new org.springframework.security.authentication.BadCredentialsException("Credenciales invalidas");
        }
    }

    private IntentoLogin obtener(String clave, Instant ahora) {
        // La limpieza puede eliminar una fila antigua entre el UPSERT y el SELECT.
        for (int vuelta = 0; vuelta < 3; vuelta++) {
            intentos.asegurar(clave, ahora);
            IntentoLogin registro = intentos.bloquear(clave);
            if (registro != null) return registro;
        }
        throw new IllegalStateException("No se pudo adquirir el registro de protección de login");
    }

    private String digest(String valor) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("No se pudo inicializar la protección de autenticación");
        }
    }
}
