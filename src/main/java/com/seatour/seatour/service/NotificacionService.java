package com.seatour.seatour.service;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.Notificacion;
import com.seatour.seatour.repository.NotificacionRepository;
import com.seatour.seatour.repository.UsuarioRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;

@Service
@Transactional(readOnly = true)
public class NotificacionService {
    private final NotificacionRepository notificaciones;
    private final UsuarioRepository usuarios;

    public NotificacionService(NotificacionRepository notificaciones, UsuarioRepository usuarios) {
        this.notificaciones = notificaciones;
        this.usuarios = usuarios;
    }

    /** Uso interno desde servicios transaccionales: persiste junto al cambio de negocio.
     * La clave debe identificar el evento concreto; su unicidad se aplica por destinatario.
     * Un reintento devuelve la notificación original sin cambiar contenido ni lectura.
     * Para varios destinatarios, bloquear usuarios en orden ascendente de id.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public NotificacionRespuesta generar(Long usuarioId, String claveDeduplicacion,
            String tipo, String titulo, String mensaje) {
        validarId(usuarioId);
        String clave = validarTexto(claveDeduplicacion, 200, "clave de deduplicación");
        String tipoValidado = validarTexto(tipo, 100, "tipo");
        String tituloValidado = validarTexto(titulo, 200, "título");
        String mensajeValidado = validarTexto(mensaje, 2000, "mensaje");
        // Serializa las publicaciones de cada usuario antes de comprobar la clave.
        // La restricción única protege además la integridad en la base de datos.
        var usuario = usuarios.bloquearPorId(usuarioId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        var existente = notificaciones.findByUsuario_IdAndClaveDeduplicacion(usuarioId, clave);
        if (existente.isPresent()) return NotificacionRespuesta.desde(existente.get());
        return NotificacionRespuesta.desde(notificaciones.saveAndFlush(
                new Notificacion(usuario, clave, tipoValidado, tituloValidado, mensajeValidado)));
    }

    public NotificacionesPaginaRespuesta listar(LoginRespuesta actor, int pagina, int tamanio) {
        Long usuarioId = usuarioAutenticado(actor);
        if (pagina < 0 || tamanio < 1 || tamanio > 100)
            throw error(HttpStatus.BAD_REQUEST, "La página debe ser no negativa y el tamaño debe estar entre 1 y 100");
        var resultado = notificaciones.findByUsuario_IdOrderByCreadaEnDescIdDesc(
                usuarioId, PageRequest.of(pagina, tamanio));
        return new NotificacionesPaginaRespuesta(resultado.getContent().stream()
                .map(NotificacionRespuesta::desde).toList(), resultado.getNumber(), resultado.getSize(),
                resultado.getTotalElements(), resultado.getTotalPages());
    }

    public NotificacionesContadorRespuesta contarNoLeidas(LoginRespuesta actor) {
        return new NotificacionesContadorRespuesta(
                notificaciones.countByUsuario_IdAndLeidaEnIsNull(usuarioAutenticado(actor)));
    }

    @Transactional
    public NotificacionRespuesta marcarLeida(Long id, LoginRespuesta actor) {
        validarId(id);
        Long usuarioId = usuarioAutenticado(actor);
        // Actualización condicional: conserva la primera fecha de lectura ante reintentos.
        notificaciones.marcarLeida(id, usuarioId, Instant.now());
        return NotificacionRespuesta.desde(notificaciones.findByIdAndUsuario_Id(id, usuarioId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Notificación no encontrada")));
    }

    @Transactional
    public void marcarTodasLeidas(LoginRespuesta actor) {
        notificaciones.marcarTodasLeidas(usuarioAutenticado(actor), Instant.now());
    }

    private Long usuarioAutenticado(LoginRespuesta actor) {
        if (actor == null || actor.id() == null || actor.id() <= 0)
            throw error(HttpStatus.UNAUTHORIZED, "Sesión inválida");
        return actor.id();
    }
    private void validarId(Long id) {
        if (id == null || id <= 0) throw error(HttpStatus.BAD_REQUEST, "El identificador debe ser positivo");
    }
    private String validarTexto(String texto, int maximo, String campo) {
        if (texto == null || texto.isBlank() || texto.strip().length() > maximo)
            throw error(HttpStatus.BAD_REQUEST, "El campo " + campo + " es obligatorio y admite hasta " + maximo + " caracteres");
        return texto.strip();
    }
    private ResponseStatusException error(HttpStatus estado, String mensaje) {
        return new ResponseStatusException(estado, mensaje);
    }
}
