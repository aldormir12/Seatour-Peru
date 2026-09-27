package com.seatour.seatour.config;

import com.seatour.seatour.model.Rol;
import com.seatour.seatour.model.Usuario;
import com.seatour.seatour.repository.RolRepository;
import com.seatour.seatour.repository.UsuarioRepository;
import jakarta.validation.Validator;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Component
@Order(1)
public class AdminInicial implements ApplicationRunner {
    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final PasswordEncoder encoder;
    private final Validator validator;

    public AdminInicial(UsuarioRepository usuarios, RolRepository roles,
            PasswordEncoder encoder, Validator validator) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.encoder = encoder;
        this.validator = validator;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Incluye administradores inactivos: nunca restablecer una cuenta existente.
        if (usuarios.existsByRol_Nombre("ADMIN")) {
            return;
        }

        String email = System.getenv("SEATOUR_ADMIN_EMAIL");
        String password = System.getenv("SEATOUR_ADMIN_PASSWORD");
        if (email == null && password == null) {
            return;
        }
        if (email == null || password == null) {
            throw new IllegalStateException(
                    "La inicializacion ADMIN requiere SEATOUR_ADMIN_EMAIL y SEATOUR_ADMIN_PASSWORD.");
        }

        String correo = email.trim().toLowerCase(Locale.ROOT);
        if (correo.length() > 255
                || !validator.validateValue(Usuario.class, "correo", correo).isEmpty()) {
            throw new IllegalStateException("El correo de inicializacion ADMIN no es valido.");
        }
        // No recortar ni normalizar la contrasena.
        if (password.isBlank() || password.length() < 12 || password.length() > 1024) {
            throw new IllegalStateException(
                    "La contrasena de inicializacion ADMIN debe tener de 12 a 1024 caracteres y no estar en blanco.");
        }
        if (usuarios.existsByCorreo(correo)) {
            throw new IllegalStateException(
                    "El correo de inicializacion ADMIN ya esta registrado; no se modificara la cuenta.");
        }

        Rol admin = roles.findByNombre("ADMIN")
                .orElseThrow(() -> new IllegalStateException("El rol ADMIN no esta disponible."));

        Usuario usuario = new Usuario();
        usuario.setNombre("Administrador");
        usuario.setApellido("SeaTour");
        usuario.setCorreo(correo);
        usuario.setPassword(encoder.encode(password));
        usuario.setActivo(true);
        usuario.setRol(admin);
        usuarios.saveAndFlush(usuario);
    }
}
