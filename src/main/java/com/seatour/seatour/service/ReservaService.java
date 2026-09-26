package com.seatour.seatour.service;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.*;
import com.seatour.seatour.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ReservaService {
    private final ReservaRepository reservas;
    private final SalidaProgramadaRepository salidas;
    private final UsuarioRepository usuarios;
    private static final ZoneId ZONA = ZoneId.of("America/Lima");

    public ReservaService(ReservaRepository reservas, SalidaProgramadaRepository salidas, UsuarioRepository usuarios) {
        this.reservas = reservas; this.salidas = salidas; this.usuarios = usuarios;
    }

    @Transactional
    public ReservaRespuesta crear(ReservaCreacion datos, LoginRespuesta actor) {
        if (!"CLIENTE".equals(actor.rol())) throw error(HttpStatus.FORBIDDEN, "Solo un cliente puede reservar");
        if (datos.salidaId() == null || datos.salidaId() <= 0 || datos.pasajeros() == null || datos.pasajeros() <= 0)
            throw error(HttpStatus.BAD_REQUEST, "Indica una salida y una cantidad positiva de pasajeros");
        // Toda escritura de cupos (incluida la gestion de salidas) usa el mismo bloqueo.
        SalidaProgramada salida = bloquearSalida(datos.salidaId());
        if (!abierta(salida) || !Boolean.TRUE.equals(salida.getTour().getActivo()))
            throw error(HttpStatus.CONFLICT, "La salida ya no admite reservas");
        if (datos.pasajeros() > salida.getCuposDisponibles())
            throw error(HttpStatus.CONFLICT, "No hay suficientes cupos disponibles");
        var cliente = usuarios.findById(actor.id()).orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "Sesion invalida"));
        var precio = salida.getTour().getPrecioBase();
        if (precio == null || precio.signum() <= 0) throw error(HttpStatus.CONFLICT, "El tour no tiene un precio valido");
        if (datos.precioEsperado() != null && precio.compareTo(datos.precioEsperado()) != 0)
            throw error(HttpStatus.CONFLICT, "El precio cambio. Revisa el nuevo resumen antes de reservar");
        salida.setCuposDisponibles(salida.getCuposDisponibles() - datos.pasajeros());
        var reserva = reservas.saveAndFlush(new Reserva(cliente, salida, datos.pasajeros(), precio));
        return respuesta(reserva, actor);
    }

    public List<ReservaRespuesta> listar(LoginRespuesta actor, boolean soloMias) {
        if (!soloMias && !gestor(actor)) throw error(HttpStatus.FORBIDDEN, "Acceso denegado");
        var lista = soloMias ? reservas.findByClienteIdOrderByCreadaEnDescIdDesc(actor.id())
                : reservas.findAllByOrderByCreadaEnDescIdDesc();
        return lista.stream().map(r -> respuesta(r, actor)).toList();
    }

    public ReservaRespuesta consultar(Long id, LoginRespuesta actor) {
        var reserva = reservas.findById(id).orElseThrow(this::noEncontrada);
        autorizar(reserva, actor);
        return respuesta(reserva, actor);
    }

    @Transactional
    public ReservaRespuesta confirmar(Long id, LoginRespuesta actor) {
        if (!gestor(actor)) throw error(HttpStatus.FORBIDDEN, "Acceso denegado");
        Reserva reserva = bloquearReserva(id);
        if (reserva.getEstado() != EstadoReserva.PENDIENTE || !abierta(reserva.getSalida()))
            throw error(HttpStatus.CONFLICT, "Solo se puede confirmar una reserva pendiente antes de la salida");
        reserva.confirmar();
        return respuesta(reserva, actor);
    }

    @Transactional
    public ReservaRespuesta cancelar(Long id, LoginRespuesta actor) {
        Reserva reserva = bloquearReserva(id);
        autorizar(reserva, actor);
        // Reintentos y cancelaciones concurrentes son idempotentes: nunca reintegran dos veces.
        if (reserva.getEstado() == EstadoReserva.CANCELADA) return respuesta(reserva, actor);
        if (!cancelable(reserva)) throw error(HttpStatus.CONFLICT, "No se puede cancelar una reserva cuya salida ya comenzo");
        var salida = reserva.getSalida();
        salida.setCuposDisponibles(Math.addExact(salida.getCuposDisponibles(), reserva.getPasajeros()));
        reserva.cancelar();
        return respuesta(reserva, actor);
    }

    private Reserva bloquearReserva(Long id) {
        Long salidaId = reservas.buscarSalidaId(id).orElseThrow(this::noEncontrada);
        // Orden fijo salida -> reserva evita interbloqueos entre reservar, confirmar y cancelar.
        bloquearSalida(salidaId);
        return reservas.bloquearPorId(id).orElseThrow(this::noEncontrada);
    }
    private SalidaProgramada bloquearSalida(Long id) {
        return salidas.bloquearPorId(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Salida no encontrada"));
    }
    private boolean futura(SalidaProgramada s) {
        return LocalDateTime.of(s.getFecha(), s.getHoraSalida()).isAfter(LocalDateTime.now(ZONA));
    }
    private boolean abierta(SalidaProgramada s) { return s.getEstado() == EstadoSalida.PROGRAMADA && futura(s); }
    private boolean cancelable(Reserva r) {
        return r.getEstado() != EstadoReserva.CANCELADA && futura(r.getSalida())
                && (r.getSalida().getEstado() == EstadoSalida.PROGRAMADA || r.getSalida().getEstado() == EstadoSalida.CANCELADA);
    }
    private boolean gestor(LoginRespuesta a) { return "ADMIN".equals(a.rol()) || "OPERADOR".equals(a.rol()); }
    private void autorizar(Reserva r, LoginRespuesta a) {
        if (!gestor(a) && !("CLIENTE".equals(a.rol()) && r.getCliente().getId().equals(a.id()))) throw noEncontrada();
    }
    private ResponseStatusException noEncontrada() { return error(HttpStatus.NOT_FOUND, "Reserva no encontrada"); }
    private ResponseStatusException error(HttpStatus estado, String mensaje) { return new ResponseStatusException(estado, mensaje); }
    private ReservaRespuesta respuesta(Reserva r, LoginRespuesta a) {
        var s = r.getSalida();
        return new ReservaRespuesta(r.getId(), r.getCliente().getId(),
                r.getCliente().getNombre() + " " + r.getCliente().getApellido(), s.getId(), s.getTour().getNombre(),
                s.getFecha(), s.getHoraSalida(), s.getEmbarcacion().getNombre(), r.getPasajeros(),
                r.getPrecioUnitario(), r.getPrecioTotal(), "PEN", r.getEstado(), r.getCreadaEn(),
                r.getConfirmadaEn(), r.getCanceladaEn(), s.getCuposDisponibles(),
                gestor(a) && r.getEstado() == EstadoReserva.PENDIENTE && abierta(s), cancelable(r));
    }
}
