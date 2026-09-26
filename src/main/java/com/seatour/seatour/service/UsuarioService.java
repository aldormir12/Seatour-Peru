package com.seatour.seatour.service;

import com.seatour.seatour.dto.UsuarioCreacion;
import com.seatour.seatour.dto.UsuarioRespuesta;
import com.seatour.seatour.model.Rol;
import com.seatour.seatour.model.Usuario;
import com.seatour.seatour.repository.RolRepository;
import com.seatour.seatour.repository.UsuarioRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@Validated
@Transactional(readOnly = true)
public class UsuarioService {

    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final PasswordEncoder encoder;

    public UsuarioService(
            UsuarioRepository usuarios,
            RolRepository roles,
            PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.encoder = encoder;
    }

    public List<UsuarioRespuesta> listarTodos() {
        return usuarios.findAll()
                .stream()
                .map(UsuarioRespuesta::desde)
                .toList();
    }

    public UsuarioRespuesta buscarPorId(Long id) {
        Usuario usuario = usuarios.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Usuario no encontrado"));

        return UsuarioRespuesta.desde(usuario);
    }

    public Optional<UsuarioRespuesta> buscarPorCorreo(String correo) {
        return usuarios
                .findByCorreo(normalizarCorreo(correo))
                .map(UsuarioRespuesta::desde);
    }

    @Transactional
    public UsuarioRespuesta crear(
            @Valid UsuarioCreacion datos) {

        String correo = normalizarCorreo(
                datos.correo());

        if (usuarios.existsByCorreo(correo)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El correo ya está registrado");
        }

        Rol cliente = roles.findByNombre("CLIENTE")
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "El rol CLIENTE no está disponible"));

        Usuario usuario = new Usuario();

        usuario.setNombre(
                datos.nombre().trim());

        usuario.setApellido(
                datos.apellido().trim());

        usuario.setCorreo(correo);

        usuario.setPassword(
                encoder.encode(datos.password()));

        usuario.setActivo(true);
        usuario.setRol(cliente);

        return UsuarioRespuesta.desde(
                usuarios.saveAndFlush(usuario));
    }

    private String normalizarCorreo(
            String correo) {
        return correo
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}