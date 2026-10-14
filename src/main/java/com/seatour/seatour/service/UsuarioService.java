package com.seatour.seatour.service;

import com.seatour.seatour.dto.UsuarioCreacion;
import com.seatour.seatour.dto.UsuarioRespuesta;
import com.seatour.seatour.dto.UsuarioEstado;
import com.seatour.seatour.dto.OperadorEdicion;
import com.seatour.seatour.dto.OperadorPassword;
import com.seatour.seatour.model.Rol;
import com.seatour.seatour.model.Usuario;
import com.seatour.seatour.repository.RolRepository;
import com.seatour.seatour.repository.UsuarioRepository;
import com.seatour.seatour.repository.SalidaProgramadaRepository;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final SalidaProgramadaRepository salidas;

    public UsuarioService(
            UsuarioRepository usuarios,
            RolRepository roles,
            PasswordEncoder encoder,
            SalidaProgramadaRepository salidas) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.encoder = encoder;
        this.salidas = salidas;
    }

    public List<UsuarioRespuesta> listarTodos() {
        return usuarios.findByRol_NombreIn(List.of("ADMIN", "OPERADOR"))
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
        String password = datos.password();
        if (password == null || password.length() < 8
                || !password.matches("(?s).*\\p{L}.*") || !password.matches("(?s).*[0-9].*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La contraseña debe tener al menos 8 caracteres, una letra y un número");
        }
        return crearConRol(datos, "CLIENTE");
    }

    @Transactional
    public UsuarioRespuesta crearOperador(@Valid UsuarioCreacion datos) {
        try {
            return crearConRol(datos, "OPERADOR");
        } catch (DataIntegrityViolationException ex) {
            // El índice único también protege frente a registros concurrentes del mismo correo.
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se pudo crear el operador: conflicto con los datos existentes", ex);
        }
    }

    @Transactional
    public UsuarioRespuesta editarOperador(Long id, @Valid OperadorEdicion datos) {
        Usuario usuario = bloquearOperador(id);
        String correo = normalizarCorreo(datos.correo());
        if (usuarios.findByCorreo(correo).filter(otro -> !otro.getId().equals(id)).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo ya está registrado");
        usuario.setNombre(datos.nombre().trim());
        usuario.setApellido(datos.apellido().trim());
        usuario.setCorreo(correo);
        try {
            return UsuarioRespuesta.desde(usuarios.saveAndFlush(usuario));
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se pudo editar el operador: conflicto con los datos existentes", ex);
        }
    }

    @Transactional
    public void restablecerPasswordOperador(Long id, @Valid OperadorPassword datos) {
        Usuario usuario = bloquearOperador(id);
        usuario.setPassword(encoder.encode(datos.password()));
        usuarios.saveAndFlush(usuario);
    }

    private Usuario bloquearOperador(Long id) {
        Usuario usuario = usuarios.bloquearPorId(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        if (usuario.getRol() == null || !"OPERADOR".equals(usuario.getRol().getNombre()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Esta operación solo está permitida para usuarios OPERADOR");
        return usuario;
    }

    @Transactional
    public UsuarioRespuesta cambiarEstado(Long id, @Valid UsuarioEstado datos, Long actorId) {
        if (!datos.activo() && id.equals(actorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "No puedes desactivar tu propia cuenta");
        }
        Usuario usuario = usuarios.bloquearPorId(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Usuario no encontrado"));
        if (!datos.activo() && "OPERADOR".equals(usuario.getRol().getNombre())) {
            var ahora = java.time.LocalDateTime.now(java.time.ZoneId.of("America/Lima"));
            if (salidas.contarSalidasFuturasDelOperador(id, ahora.toLocalDate(), ahora.toLocalTime()) > 0)
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "No se puede desactivar un operador con salidas futuras no canceladas asignadas");
        }
        usuario.setActivo(datos.activo());
        return UsuarioRespuesta.desde(usuarios.saveAndFlush(usuario));
    }

    private UsuarioRespuesta crearConRol(UsuarioCreacion datos, String nombreRol) {

        String correo = normalizarCorreo(
                datos.correo());

        if (usuarios.existsByCorreo(correo)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El correo ya está registrado");
        }

        Rol rol = roles.findByNombre(nombreRol)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "El rol " + nombreRol + " no está disponible"));

        Usuario usuario = new Usuario();

        usuario.setNombre(
                datos.nombre().trim());

        usuario.setApellido(
                datos.apellido().trim());

        usuario.setCorreo(correo);

        usuario.setPassword(
                encoder.encode(datos.password()));

        usuario.setActivo(true);
        usuario.setRol(rol);

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
