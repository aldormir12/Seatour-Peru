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
    private final TourRepository tours;
    private final EmbarcacionRepository embarcaciones;
    private final TarifasPasajerosService tarifas;
    private final AdicionalService adicionales;
    private final NotificacionService notificaciones;
    private final ResenaRepository resenas;
    private static final ZoneId ZONA = ZoneId.of("America/Lima");

    public ReservaService(ReservaRepository reservas, SalidaProgramadaRepository salidas, UsuarioRepository usuarios,
            TourRepository tours, EmbarcacionRepository embarcaciones, TarifasPasajerosService tarifas, AdicionalService adicionales, NotificacionService notificaciones, ResenaRepository resenas) {
        this.reservas = reservas; this.salidas = salidas; this.usuarios = usuarios;
        this.tours = tours; this.embarcaciones = embarcaciones; this.tarifas = tarifas; this.adicionales = adicionales;
        this.notificaciones = notificaciones;
        this.resenas = resenas;
    }

    @Transactional
    public ReservaRespuesta crear(ReservaCreacion datos, LoginRespuesta actor) {
        if (!"CLIENTE".equals(actor.rol())) throw error(HttpStatus.FORBIDDEN, "Solo un cliente puede reservar");
        if (datos == null || datos.salidaId() == null || datos.salidaId() <= 0
                || !datos.composicion().esValida())
            throw error(HttpStatus.BAD_REQUEST, "Indica cantidades enteras no negativas y al menos un pasajero");
        // Toda escritura de cupos (incluida la gestion de salidas) usa el mismo bloqueo.
        SalidaProgramada salida = bloquearSalida(datos.salidaId());
        validarSalidaReservable(salida);
        if (datos.totalPasajeros() > salida.getCuposDisponibles())
            throw error(HttpStatus.CONFLICT, "No hay suficientes cupos disponibles");
        var cliente = usuarios.findById(actor.id()).orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "Sesion invalida"));
        var precio = salida.getTour().getPrecioBase();
        if (precio == null || precio.signum() <= 0) throw error(HttpStatus.CONFLICT, "El tour no tiene un precio valido");
        var total = tarifas.total(precio, datos.ninos(), datos.adultos(), datos.adultosMayores());
        var nueva = new Reserva(cliente, salida, precio, datos.ninos(), datos.adultos(), datos.adultosMayores(), total);
        nueva.agregarAdicionales(adicionales.seleccionar(salida.getTour().getId(), datos.totalPasajeros(), datos.adicionalesIds()));
        if (datos.precioEsperado() != null && nueva.getPrecioTotal().compareTo(datos.precioEsperado()) != 0)
            throw error(HttpStatus.CONFLICT, "El precio cambio. Revisa el nuevo resumen antes de reservar");
        salida.setCuposDisponibles(salida.getCuposDisponibles() - datos.totalPasajeros());
        var reserva = reservas.saveAndFlush(nueva);
        notificarReserva(reserva, "RESERVA_CREADA", "Reserva realizada",
                "Reserva realizada con éxito. Revisa tu correo para ver los detalles de tu reserva.");
        return respuesta(reserva, actor);
    }

    private void validarSalidaReservable(SalidaProgramada salida) {
        HorizonteOperativo.validar(salida.getFecha());
        salida.setTour(tours.bloquearPorId(salida.getTour().getId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Tour no encontrado")));
        salida.setEmbarcacion(embarcaciones.bloquearPorId(salida.getEmbarcacion().getId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Embarcación no encontrada")));
        if (!abierta(salida) || !Boolean.TRUE.equals(salida.getTour().getActivo())
                || !Boolean.TRUE.equals(salida.getEmbarcacion().getActivo()))
            throw error(HttpStatus.CONFLICT, "La salida ya no admite reservas");
        validarOcupacion(salida);
    }

    @Transactional
    public PlanReservaResumen resumenPlan(PlanReservaSeleccion seleccion, LoginRespuesta actor) {
        return resumenPlanBloqueado(bloquearPlan(seleccion, actor), seleccion.composicion(), seleccion.adicionalesIds());
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    List<SalidaProgramada> bloquearPlan(PlanReservaSeleccion seleccion, LoginRespuesta actor) {
        if (!"CLIENTE".equals(actor.rol())) throw error(HttpStatus.FORBIDDEN, "Solo un cliente puede reservar");
        if (seleccion == null || seleccion.composicion() == null || !seleccion.composicion().esValida()
                || seleccion.items() == null || seleccion.items().isEmpty()
                || seleccion.items().size() > 20 || seleccion.items().stream().anyMatch(i -> i == null || i.salidaId() == null || i.salidaId() <= 0))
            throw error(HttpStatus.BAD_REQUEST, "Indica las experiencias y una cantidad válida de pasajeros");
        var ids = seleccion.items().stream().map(PlanReservaSeleccion.Item::salidaId).distinct().sorted().toList();
        if (ids.size() != seleccion.items().size()) throw error(HttpStatus.BAD_REQUEST, "El plan contiene salidas repetidas");
        var lista = ids.stream().map(this::bloquearSalida).toList();
        // Adquirir todos los bloqueos antes de crear evita inversión de orden entre planes.
        lista.stream().map(s -> s.getTour().getId()).distinct().sorted().forEach(id -> tours.bloquearPorId(id).orElseThrow());
        lista.stream().map(s -> s.getEmbarcacion().getId()).distinct().sorted().forEach(id -> embarcaciones.bloquearPorId(id).orElseThrow());
        var primera = lista.get(0);
        if (lista.stream().anyMatch(s -> !s.getFecha().equals(primera.getFecha())
                || s.getTour().getZonaMaritima() != primera.getTour().getZonaMaritima()))
            throw error(HttpStatus.BAD_REQUEST, "Todas las experiencias deben pertenecer al mismo día y zona");
        var cronologico = lista.stream().sorted(java.util.Comparator.comparing(SalidaProgramada::getHoraSalida)).toList();
        for (int i = 1; i < cronologico.size(); i++) {
            var anterior = cronologico.get(i - 1);
            var fin = LocalDateTime.of(anterior.getFecha(), anterior.getHoraSalida()).plusMinutes(anterior.getTour().getDuracionMinutos());
            if (fin.isAfter(LocalDateTime.of(cronologico.get(i).getFecha(), cronologico.get(i).getHoraSalida())))
                throw error(HttpStatus.CONFLICT, "Las experiencias del plan se superponen");
        }
        adicionales.bloquearSeleccionPlan(seleccion.adicionalesIds());
        return lista;
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    PlanReservaResumen resumenPlanBloqueado(List<SalidaProgramada> lista, ComposicionPasajeros composicion, List<Long> adicionalesIds) {
        int pasajeros = composicion.totalPasajeros();
        var items = new java.util.ArrayList<PlanReservaResumen.Item>();
        var extras = new java.util.LinkedHashMap<Long, ReservaAdicionalRespuesta>();
        for (var salida : lista) {
            String problema = null;
            java.math.BigDecimal subtotal = java.math.BigDecimal.ZERO;
            try {
                validarSalidaReservable(salida);
                var precio = salida.getTour().getPrecioBase();
                if (precio == null || precio.signum() <= 0) throw error(HttpStatus.CONFLICT, "El tour no tiene un precio válido");
                subtotal = tarifas.total(precio, composicion.ninos(), composicion.adultos(), composicion.adultosMayores());
                if (pasajeros > salida.getCuposDisponibles()) problema = "Cupos insuficientes";
            } catch (ResponseStatusException e) {
                problema = e.getReason();
            }
            // Usar el cálculo y las validaciones individuales, una vez por reserva del plan.
            for (var adicional : adicionales.seleccionar(salida.getTour().getId(), pasajeros, adicionalesIds)) {
                var detalle = ReservaAdicionalRespuesta.desde(adicional);
                extras.merge(detalle.adicionalId(), detalle, (a, b) -> new ReservaAdicionalRespuesta(
                        a.adicionalId(), a.nombre(), a.descripcion(), a.tipoCobro(), a.cantidad() + b.cantidad(),
                        a.precioUnitario(), a.subtotal().add(b.subtotal())));
            }
            items.add(new PlanReservaResumen.Item(salida.getId(), salida.getTour().getNombre(),
                    salida.getCuposDisponibles() == null ? 0 : salida.getCuposDisponibles(), subtotal, problema));
        }
        var subtotalExtras = extras.values().stream().map(ReservaAdicionalRespuesta::subtotal)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        return new PlanReservaResumen(List.copyOf(items), items.stream().map(PlanReservaResumen.Item::subtotal)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add).add(subtotalExtras),
                items.stream().allMatch(i -> i.problema() == null), List.copyOf(extras.values()), subtotalExtras);
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    List<ReservaRespuesta> reservasDelPlan(java.util.UUID operacionId, LoginRespuesta actor) {
        // El usuario se bloquea después de salidas/tours/embarcaciones, igual que al notificar reservas.
        usuarios.bloquearPorId(actor.id()).orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "Sesión inválida"));
        return reservas.findByClienteIdAndPlanOperacionIdOrderByIdAsc(actor.id(), operacionId.toString())
                .stream().map(r -> respuesta(r, actor)).toList();
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    void asociarPlan(Long reservaId, java.util.UUID operacionId) {
        reservas.findById(reservaId).orElseThrow(this::noEncontrada).asociarPlan(operacionId);
    }

    public List<ReservaRespuesta> listar(LoginRespuesta actor, boolean soloMias) {
        if (!soloMias && !gestor(actor)) throw error(HttpStatus.FORBIDDEN, "Acceso denegado");
        var lista = soloMias ? reservas.findByClienteIdOrderByCreadaEnDescIdDesc(actor.id())
                : "OPERADOR".equals(actor.rol())
                    ? reservas.findBySalida_Operador_IdOrderByCreadaEnDescIdDesc(actor.id())
                    : reservas.findAllByOrderByCreadaEnDescIdDesc();
        return lista.stream().map(r -> respuesta(r, actor)).toList();
    }

    public ReservaRespuesta consultar(Long id, LoginRespuesta actor) {
        validarId(id);
        var reserva = reservas.findById(id).orElseThrow(this::noEncontrada);
        autorizar(reserva, actor);
        return respuesta(reserva, actor);
    }

    @Transactional
    public ReservaRespuesta confirmar(Long id, LoginRespuesta actor) {
        if (!gestor(actor)) throw error(HttpStatus.FORBIDDEN, "Acceso denegado");
        Reserva reserva = bloquearReserva(id);
        autorizar(reserva, actor);
        confirmarValidada(reserva);
        return respuesta(reserva, actor);
    }

    // Solo se invoca desde PagoService dentro de su transaccion y con la reserva bloqueada.
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    void confirmarPorPago(Reserva reserva) {
        confirmarValidada(reserva);
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    Reserva bloquearParaPago(Long id, LoginRespuesta actor) {
        Reserva reserva = bloquearReserva(id);
        if (!"CLIENTE".equals(actor.rol()) || !reserva.getCliente().getId().equals(actor.id()))
            throw noEncontrada();
        return reserva;
    }

    private void confirmarValidada(Reserva reserva) {
        if (reserva.getEstado() != EstadoReserva.PENDIENTE || !abierta(reserva.getSalida()))
            throw error(HttpStatus.CONFLICT, "Solo se puede confirmar una reserva pendiente antes de la salida");
        var salida = reserva.getSalida();
        salida.setTour(tours.bloquearPorId(salida.getTour().getId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Tour no encontrado")));
        salida.setEmbarcacion(embarcaciones.bloquearPorId(salida.getEmbarcacion().getId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Embarcación no encontrada")));
        if (!Boolean.TRUE.equals(salida.getTour().getActivo()) || !Boolean.TRUE.equals(salida.getEmbarcacion().getActivo()))
            throw error(HttpStatus.CONFLICT, "No se puede confirmar una reserva con tour o embarcación inactivos");
        validarOcupacion(salida);
        reserva.confirmar();
        notificarReserva(reserva, "RESERVA_CONFIRMADA", "Reserva confirmada",
                "Tu reserva ha sido confirmada.");
    }

    @Transactional
    public ReservaRespuesta cancelar(Long id, LoginRespuesta actor) {
        Reserva reserva = bloquearReserva(id);
        autorizar(reserva, actor);
        // Reintentos y cancelaciones concurrentes son idempotentes: nunca reintegran dos veces.
        if (reserva.getEstado() == EstadoReserva.CANCELADA) return respuesta(reserva, actor);
        if (!cancelable(reserva)) throw error(HttpStatus.CONFLICT, "No se puede cancelar una reserva cuya salida ya comenzo");
        var salida = reserva.getSalida();
        if (reserva.getPasajeros() <= 0) throw error(HttpStatus.CONFLICT, "La reserva tiene una cantidad inválida de pasajeros");
        validarOcupacion(salida);
        salida.setCuposDisponibles(Math.addExact(salida.getCuposDisponibles(), reserva.getPasajeros()));
        reserva.cancelar();
        notificarReserva(reserva, "RESERVA_CANCELADA", "Reserva cancelada",
                "Tu reserva ha sido cancelada.");
        return respuesta(reserva, actor);
    }

    private void notificarReserva(Reserva reserva, String tipo, String titulo, String mensaje) {
        notificaciones.generar(reserva.getCliente().getId(), tipo + ":" + reserva.getId(),
                tipo, titulo, mensaje);
    }

    private Reserva bloquearReserva(Long id) {
        validarId(id);
        Long salidaId = reservas.buscarSalidaId(id).orElseThrow(this::noEncontrada);
        // Orden fijo salida -> reserva evita interbloqueos entre reservar, confirmar y cancelar.
        bloquearSalida(salidaId);
        return reservas.bloquearPorId(id).orElseThrow(this::noEncontrada);
    }
    private SalidaProgramada bloquearSalida(Long id) {
        validarId(id);
        var salida = salidas.bloquearPorId(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Salida no encontrada"));
        if (salida.isEsDemo()) throw error(HttpStatus.NOT_FOUND, "Salida no encontrada");
        return salida;
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
    private void validarId(Long id) {
        if (id == null || id <= 0) throw error(HttpStatus.BAD_REQUEST, "El ID debe ser un entero positivo");
    }
    private void validarOcupacion(SalidaProgramada salida) {
        Integer cupos = salida.getCuposDisponibles();
        Integer capacidad = salida.getEmbarcacion().getCapacidad();
        long pasajeros = reservas.pasajerosActivos(salida.getId(), EstadoReserva.CANCELADA);
        if (cupos == null || cupos < 0 || capacidad == null || capacidad < 1 || capacidad > 100
                || pasajeros < 0 || cupos + pasajeros > capacidad)
            throw error(HttpStatus.CONFLICT, "Los cupos y reservas no corresponden a la capacidad de la embarcación");
    }
    private void autorizar(Reserva r, LoginRespuesta a) {
        if ("ADMIN".equals(a.rol())) return;
        if ("OPERADOR".equals(a.rol()) && r.getSalida().getOperador() != null
                && r.getSalida().getOperador().getId().equals(a.id())) return;
        if ("CLIENTE".equals(a.rol()) && r.getCliente().getId().equals(a.id())) return;
        throw noEncontrada();
    }

    public List<ReservaRespuesta> listarPorSalidaPropia(Long salidaId, LoginRespuesta actor) {
        validarId(salidaId);
        var salida = salidas.findById(salidaId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Salida no encontrada"));
        if (!"OPERADOR".equals(actor.rol()) || salida.getOperador() == null
                || !salida.getOperador().getId().equals(actor.id()))
            throw error(HttpStatus.NOT_FOUND, "Salida no encontrada");
        return reservas.findBySalidaIdOrderByIdAsc(salidaId).stream()
                .map(r -> respuesta(r, actor)).toList();
    }
    private ResponseStatusException noEncontrada() { return error(HttpStatus.NOT_FOUND, "Reserva no encontrada"); }
    private ResponseStatusException error(HttpStatus estado, String mensaje) { return new ResponseStatusException(estado, mensaje); }
    private ReservaRespuesta respuesta(Reserva r, LoginRespuesta a) {
        var s = r.getSalida();
        var resena = resenas.findByReserva_Id(r.getId()).map(ResenaRespuesta::desde).orElse(null);
        return new ReservaRespuesta(r.getId(), r.getCliente().getId(),
                r.getCliente().getNombre() + " " + r.getCliente().getApellido(), s.getId(), s.getTour().getNombre(),
                s.getFecha(), s.getHoraSalida(), s.getEmbarcacion().getNombre(), r.getPasajeros(),
                r.getPrecioUnitario(), r.getPrecioTotal(), "PEN", r.getEstado(), r.getCreadaEn(),
                r.getConfirmadaEn(), r.getCanceladaEn(), s.getCuposDisponibles(),
                gestor(a) && r.getEstado() == EstadoReserva.PENDIENTE && abierta(s)
                        && Boolean.TRUE.equals(s.getTour().getActivo())
                        && Boolean.TRUE.equals(s.getEmbarcacion().getActivo()), cancelable(r),
                r.getNinos(), r.getAdultos(), r.getAdultosMayores(), r.getPasajeros(), r.getSubtotalAdicionales(),
                r.getAdicionales().stream().map(ReservaAdicionalRespuesta::desde).toList(),
                s.getTour().getId(), s.getEstado(), "CLIENTE".equals(a.rol())
                        && r.getCliente().getId().equals(a.id()) && r.getEstado() == EstadoReserva.CONFIRMADA
                        && s.getEstado() == EstadoSalida.COMPLETADA && resena == null, resena);
    }
}
