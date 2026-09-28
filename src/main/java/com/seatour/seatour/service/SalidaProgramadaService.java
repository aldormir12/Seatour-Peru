package com.seatour.seatour.service;

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
public class SalidaProgramadaService {
    private static final ZoneId ZONA = ZoneId.of("America/Lima");
    private final SalidaProgramadaRepository salidas;
    private final TourRepository tours;
    private final EmbarcacionRepository embarcaciones;
    private final ReservaRepository reservas;

    public SalidaProgramadaService(SalidaProgramadaRepository salidas, TourRepository tours,
            EmbarcacionRepository embarcaciones, ReservaRepository reservas) {
        this.salidas = salidas;
        this.tours = tours;
        this.embarcaciones = embarcaciones;
        this.reservas = reservas;
    }

    public List<SalidaProgramada> listarTodas() { return salidas.findAll(); }

    public boolean tieneReservas(Long id) { return reservas.existsBySalidaId(id); }
    public boolean cambioOperativoConsumido(Long id) { return buscarPorId(id).isCambioOperativoConsumido(); }
    public long pasajerosReservados(Long id) { return reservas.pasajerosActivos(id, EstadoReserva.CANCELADA); }

    public SalidaProgramada buscarPorId(Long id) {
        validarId(id);
        return salidas.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Salida no encontrada"));
    }

    public List<SalidaProgramada> listarPorTour(Long tourId) {
        validarExistenciaTour(tourId);
        return salidas.findByTourIdOrderByFechaAscHoraSalidaAsc(tourId);
    }

    public List<SalidaProgramada> listarDisponiblesPorTour(Long tourId) {
        validarExistenciaTour(tourId);
        var ahora = LocalDateTime.now(ZONA);
        return salidas.buscarSalidasDisponiblesPorTour(tourId, EstadoSalida.PROGRAMADA,
                ahora.toLocalDate(), ahora.toLocalTime());
    }

    public List<com.seatour.seatour.dto.EmbarcacionRespuesta> listarEmbarcacionesActivas() {
        return embarcaciones.findAllByOrderByNombreAscIdAsc().stream()
                .filter(e -> Boolean.TRUE.equals(e.getActivo()))
                .map(com.seatour.seatour.dto.EmbarcacionRespuesta::desde).toList();
    }

    @Transactional
    public SalidaProgramada crear(SalidaProgramada salida) {
        validarDatos(salida, true);
        if (salida.getId() != null) throw error(HttpStatus.BAD_REQUEST, "Una salida nueva no debe incluir ID");
        validarEstadoEstructural(salida);
        cargarAsignacion(salida, true);
        salida.setEstado(EstadoSalida.PROGRAMADA);
        salida.setMotivoReprogramacion(null);
        validarSolapamientos(salida, null);
        return salidas.saveAndFlush(salida);
    }

    @Transactional
    public SalidaProgramada actualizar(Long id, SalidaProgramada datos) {
        var existente = bloquear(id);
        if (existente.getEstado() != EstadoSalida.PROGRAMADA)
            throw error(HttpStatus.CONFLICT, "Solo se puede reprogramar una salida PROGRAMADA");
        if (datos == null) throw error(HttpStatus.BAD_REQUEST, "Los datos de la salida son obligatorios");
        datos.setCuposDisponibles(existente.getCuposDisponibles());
        validarDatos(datos, false);
        validarEstadoEstructural(datos);
        boolean conReservas = reservas.existsBySalidaId(id);
        var anterior = inicio(existente);
        var nueva = inicio(datos);
        boolean cambiaEmbarcacion = !existente.getEmbarcacion().getId().equals(datos.getEmbarcacion().getId());
        boolean cambiaHorario = !nueva.equals(anterior);
        long pasajeros = pasajerosReservados(id);
        if (pasajeros > 0 && (cambiaHorario || cambiaEmbarcacion)) validarCambioOperativo(existente);
        if (cambiaEmbarcacion && pasajeros > 0)
            throw error(HttpStatus.CONFLICT, "Con reservas activas utiliza la acción específica Cambiar embarcación");
        if (conReservas) {
            if (!existente.getTour().getId().equals(datos.getTour().getId()))
                throw error(HttpStatus.CONFLICT, "No se puede cambiar el tour de una salida con reservas");
            var original = existente.getFechaOriginal() == null ? anterior
                    : LocalDateTime.of(existente.getFechaOriginal(), existente.getHoraOriginal());
            if ((cambiaHorario && !nueva.isAfter(anterior)) || (!cambiaHorario && !cambiaEmbarcacion))
                throw error(HttpStatus.CONFLICT, "Una salida con reservas solo puede moverse hacia adelante");
            if (cambiaHorario && nueva.isAfter(original.plusHours(72)))
                throw error(HttpStatus.CONFLICT, "La reprogramación no puede superar 72 horas del horario original: "
                        + original.plusHours(72) + " (America/Lima)");
            if (datos.getMotivoReprogramacion() == null || !java.util.Set.of(
                    "CONDICIONES_MARITIMAS", "AUTORIDAD_MARITIMA", "FALLA_TECNICA",
                    "SEGURIDAD_OPERATIVA", "FUERZA_MAYOR").contains(datos.getMotivoReprogramacion()))
                throw error(HttpStatus.BAD_REQUEST, "Selecciona un motivo válido: CONDICIONES_MARITIMAS, AUTORIDAD_MARITIMA, FALLA_TECNICA, SEGURIDAD_OPERATIVA o FUERZA_MAYOR");
            validarOcupacion(existente);
            if (cambiaHorario) {
                existente.setFechaOriginal(original.toLocalDate());
                existente.setHoraOriginal(original.toLocalTime());
            }
        }
        cargarAsignacion(datos, cambiaEmbarcacion);
        if (cambiaEmbarcacion) {
            if (pasajeros < 0 || pasajeros > datos.getEmbarcacion().getCapacidad())
                throw error(HttpStatus.CONFLICT, "La nueva embarcación no tiene capacidad para los " + pasajeros + " pasajeros reservados");
            datos.setCuposDisponibles(Math.toIntExact(datos.getEmbarcacion().getCapacidad() - pasajeros));
        }
        validarSolapamientos(datos, id);
        if (pasajeros > 0 && cambiaHorario) existente.consumirCambioOperativo();
        if (conReservas) existente.setMotivoReprogramacion(datos.getMotivoReprogramacion());
        if (!nueva.equals(anterior)) {
            existente.setFechaAnterior(existente.getFecha());
            existente.setHoraAnterior(existente.getHoraSalida());
            existente.setMotivoReprogramacion(conReservas ? datos.getMotivoReprogramacion() : null);
        }
        existente.setFecha(datos.getFecha());
        existente.setHoraSalida(datos.getHoraSalida());
        existente.setCuposDisponibles(datos.getCuposDisponibles());
        existente.setTour(datos.getTour());
        existente.setEmbarcacion(datos.getEmbarcacion());
        return salidas.saveAndFlush(existente);
    }

    @Transactional
    public void eliminar(Long id) {
        salidas.delete(bloquearSinReservas(id));
        salidas.flush();
    }

    @Transactional
    public SalidaProgramada cambiarEmbarcacion(Long id, Long embarcacionId, String motivo) {
        validarId(embarcacionId);
        if (motivo == null || !java.util.Set.of("FALLA_TECNICA", "SEGURIDAD_OPERATIVA").contains(motivo))
            throw error(HttpStatus.BAD_REQUEST, "El motivo es obligatorio: FALLA_TECNICA o SEGURIDAD_OPERATIVA");
        var salida = bloquear(id);
        if (salida.getEstado() != EstadoSalida.PROGRAMADA)
            throw error(HttpStatus.CONFLICT, "Solo se puede cambiar la embarcación de una salida PROGRAMADA");
        Long anterior = salida.getEmbarcacion().getId();
        if (anterior.equals(embarcacionId))
            throw error(HttpStatus.BAD_REQUEST, "Selecciona una embarcación diferente");
        long pasajeros = pasajerosReservados(id);
        if (pasajeros > 0) validarCambioOperativo(salida);
        var propuesta = new SalidaProgramada();
        propuesta.setFecha(salida.getFecha());
        propuesta.setHoraSalida(salida.getHoraSalida());
        propuesta.setTour(salida.getTour());
        var nueva = new Embarcacion();
        nueva.setId(embarcacionId);
        propuesta.setEmbarcacion(nueva);
        validarDatos(propuesta, true);
        cargarAsignacion(propuesta, true);
        if (pasajeros < 0 || pasajeros > propuesta.getEmbarcacion().getCapacidad())
            throw error(HttpStatus.CONFLICT, "La nueva embarcación no admite los " + pasajeros + " pasajeros con reservas activas");
        validarSolapamientos(propuesta, id);
        if (pasajeros > 0) salida.consumirCambioOperativo();
        salida.setEmbarcacion(propuesta.getEmbarcacion());
        salida.setCuposDisponibles(Math.toIntExact(propuesta.getEmbarcacion().getCapacidad() - pasajeros));
        salida.registrarCambioEmbarcacion(anterior, embarcacionId, motivo, LocalDateTime.now(ZONA));
        return salidas.saveAndFlush(salida);
    }

    @Transactional
    public SalidaProgramada cambiarEstado(Long id, EstadoSalida destino) {
        return cambiarEstado(id, destino, null);
    }

    @Transactional
    public SalidaProgramada cambiarEstado(Long id, EstadoSalida destino, String motivoCancelacion) {
        return cambiarEstado(id, destino, motivoCancelacion, false);
    }

    public List<Long> listarPendientesDeInicio() {
        var ahora = LocalDateTime.now(ZONA);
        return salidas.buscarPendientesDeInicio(ahora.toLocalDate(), ahora.toLocalTime());
    }

    @Transactional
    public void iniciarAutomaticamente(Long id) {
        // Revalidar bajo el mismo bloqueo usado por reservas y modificaciones.
        var salida = salidas.bloquearPorId(id).orElse(null);
        if (salida == null || salida.getEstado() != EstadoSalida.PROGRAMADA
                || LocalDateTime.now(ZONA).isBefore(inicio(salida))) return;
        cambiarEstado(id, EstadoSalida.EN_CURSO, null, true);
    }

    private SalidaProgramada cambiarEstado(Long id, EstadoSalida destino, String motivoCancelacion,
            boolean inicioAutomatico) {
        if (destino == null) throw error(HttpStatus.BAD_REQUEST, "El estado es obligatorio");
        if (motivoCancelacion != null && !java.util.Set.of(
                "CONDICIONES_MARITIMAS", "AUTORIDAD_MARITIMA", "FALLA_TECNICA",
                "SEGURIDAD_OPERATIVA", "FUERZA_MAYOR").contains(motivoCancelacion))
            throw error(HttpStatus.BAD_REQUEST, "Motivo de cancelación inválido. Valores permitidos: CONDICIONES_MARITIMAS, AUTORIDAD_MARITIMA, FALLA_TECNICA, SEGURIDAD_OPERATIVA o FUERZA_MAYOR");
        var salida = bloquear(id);
        var origen = salida.getEstado();
        boolean valida = origen == EstadoSalida.PROGRAMADA
                && (destino == EstadoSalida.EN_CURSO || destino == EstadoSalida.CANCELADA)
                || origen == EstadoSalida.EN_CURSO && destino == EstadoSalida.COMPLETADA;
        if (!valida) throw error(HttpStatus.CONFLICT, "Transición de estado no permitida: " + origen + " -> " + destino);
        if (destino == EstadoSalida.CANCELADA && reservas.existsBySalidaId(id) && motivoCancelacion == null)
            throw error(HttpStatus.BAD_REQUEST, "El motivo de cancelación es obligatorio cuando la salida tiene reservas");
        var ahora = LocalDateTime.now(ZONA);
        if (destino == EstadoSalida.EN_CURSO) {
            if (ahora.isBefore(inicio(salida))) throw error(HttpStatus.CONFLICT, "La salida no puede iniciar antes de su hora programada");
            if (!inicioAutomatico && !ahora.isBefore(fin(salida))) throw error(HttpStatus.CONFLICT, "El intervalo programado ya terminó; la salida no puede iniciarse");
            bloquearAsignacion(salida);
            validarRecursos(salida);
            validarSolapamientos(salida, id);
            // Una salida atrasada no debe iniciar mientras otra usa la embarcación.
            if (salidas.findByEmbarcacionIdOrderByFechaAscHoraSalidaAsc(salida.getEmbarcacion().getId()).stream()
                    .anyMatch(s -> !s.getId().equals(id) && s.getEstado() == EstadoSalida.EN_CURSO)) {
                throw error(HttpStatus.CONFLICT, "La embarcación ya tiene una salida en curso");
            }
        }
        if (destino == EstadoSalida.COMPLETADA && ahora.isBefore(fin(salida))) {
            throw error(HttpStatus.CONFLICT, "La salida no puede completarse antes de su hora prevista de finalización");
        }
        if (destino != EstadoSalida.EN_CURSO) {
            salida.setEmbarcacion(embarcaciones.bloquearPorId(salida.getEmbarcacion().getId())
                    .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Embarcación no encontrada")));
        }
        validarOcupacion(salida);
        if (destino == EstadoSalida.CANCELADA) {
            // Toda operación de reservas bloquea primero la salida: no hay doble restitución.
            long reintegrar = 0;
            for (var reserva : reservas.findBySalidaIdOrderByIdAsc(id)) {
                if (reserva.getEstado() != EstadoReserva.CANCELADA) {
                    if (reserva.getPasajeros() <= 0) throw error(HttpStatus.CONFLICT, "Una reserva tiene una cantidad inválida de pasajeros");
                    reintegrar += reserva.getPasajeros();
                    reserva.cancelar();
                }
            }
            salida.setCuposDisponibles(Math.toIntExact(salida.getCuposDisponibles() + reintegrar));
            salida.setMotivoCancelacion(motivoCancelacion);
            salida.setFechaCancelacion(LocalDateTime.now(ZONA));
        }
        salida.setEstado(destino);
        return salidas.saveAndFlush(salida);
    }

    private void validarCambioOperativo(SalidaProgramada salida) {
        if (salida.isCambioOperativoConsumido())
            throw error(HttpStatus.CONFLICT, "La salida ya consumió su único cambio operativo con reservas activas; no se permite reprogramar ni cambiar la embarcación");
    }

    private SalidaProgramada bloquear(Long id) {
        validarId(id);
        return salidas.bloquearPorId(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Salida no encontrada"));
    }

    private SalidaProgramada bloquearSinReservas(Long id) {
        var salida = bloquear(id);
        if (salida.getEstado() != EstadoSalida.PROGRAMADA)
            throw error(HttpStatus.CONFLICT, "Solo se puede eliminar una salida PROGRAMADA; no se permite eliminar salidas EN_CURSO, COMPLETADA o CANCELADA");
        if (reservas.existsBySalidaId(id)) throw error(HttpStatus.CONFLICT,
                "No se puede eliminar una salida que tiene o tuvo reservas, incluidas las CANCELADAS; utiliza la cancelación para conservar su historial");
        if (!inicio(salida).isAfter(LocalDateTime.now(ZONA)))
            throw error(HttpStatus.CONFLICT, "No se puede eliminar una salida cuya hora programada ya pasó");
        return salida;
    }

    private void cargarAsignacion(SalidaProgramada salida, boolean creacion) {
        bloquearAsignacion(salida);
        validarRecursos(salida);
        if (creacion) salida.setCuposDisponibles(salida.getEmbarcacion().getCapacidad());
        if (salida.getCuposDisponibles() > salida.getEmbarcacion().getCapacidad())
            throw error(HttpStatus.BAD_REQUEST, "Los cupos no pueden superar la capacidad de la embarcación");
        fin(salida); // Detecta también fechas que desbordan al sumar la duración.
    }

    private void bloquearAsignacion(SalidaProgramada salida) {
        // Orden de bloqueo: salida (si existe), tour, embarcación.
        salida.setTour(tours.bloquearPorId(salida.getTour().getId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "El tour indicado no existe")));
        salida.setEmbarcacion(embarcaciones.bloquearPorId(salida.getEmbarcacion().getId())
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "La embarcación indicada no existe")));
    }

    private void validarRecursos(SalidaProgramada salida) {
        if (!Boolean.TRUE.equals(salida.getTour().getActivo()))
            throw error(HttpStatus.CONFLICT, "El tour debe estar activo");
        if (!Boolean.TRUE.equals(salida.getEmbarcacion().getActivo()))
            throw error(HttpStatus.CONFLICT, "La embarcación debe estar activa");
        Integer capacidad = salida.getEmbarcacion().getCapacidad();
        if (capacidad == null || capacidad < 1 || capacidad > 100)
            throw error(HttpStatus.CONFLICT, "La embarcación debe tener una capacidad entre 1 y 100");
        Integer duracion = salida.getTour().getDuracionMinutos();
        if (duracion == null || duracion <= 0)
            throw error(HttpStatus.CONFLICT, "El tour debe tener una duración válida");
    }

    private void validarOcupacion(SalidaProgramada salida) {
        Integer cupos = salida.getCuposDisponibles();
        Integer capacidad = salida.getEmbarcacion().getCapacidad();
        long ocupados = reservas.pasajerosActivos(salida.getId(), EstadoReserva.CANCELADA);
        if (cupos == null || cupos < 0 || capacidad == null || capacidad < 1 || capacidad > 100
                || ocupados < 0 || cupos + ocupados > capacidad)
            throw error(HttpStatus.CONFLICT, "Los cupos y reservas son incompatibles con la capacidad de la embarcación");
    }

    private void validarSolapamientos(SalidaProgramada salida, Long excluirId) {
        var inicio = inicio(salida);
        var fin = finOperativo(salida);
        // Se incluyen días adyacentes: un recorrido puede cruzar medianoche.
        for (var otra : salidas.findByEmbarcacionIdOrderByFechaAscHoraSalidaAsc(salida.getEmbarcacion().getId())) {
            if (otra.getId().equals(excluirId) || otra.getEstado() == EstadoSalida.CANCELADA) continue;
            if (inicio.isBefore(finOperativo(otra)) && inicio(otra).isBefore(fin))
                throw error(HttpStatus.CONFLICT, "Conflicto con la salida " + otra.getId()
                        + ": la embarcación requiere 60 minutos de buffer después de cada tour."
                        + " Su intervalo ocupado termina el " + finOperativo(otra) + " (America/Lima)");
        }
    }

    private static LocalDateTime inicio(SalidaProgramada salida) {
        if (salida.getFecha() == null || salida.getHoraSalida() == null)
            throw error(HttpStatus.CONFLICT, "La salida tiene una fecha u hora inválida");
        return LocalDateTime.of(salida.getFecha(), salida.getHoraSalida());
    }

    private static LocalDateTime fin(SalidaProgramada salida) {
        var duracion = salida.getTour().getDuracionMinutos();
        if (duracion == null || duracion <= 0) throw error(HttpStatus.CONFLICT, "El tour tiene una duración inválida");
        try { return inicio(salida).plusMinutes(duracion); }
        catch (DateTimeException | ArithmeticException ex) {
            throw error(HttpStatus.BAD_REQUEST, "La fecha y duración producen una hora final fuera de rango");
        }
    }

    private static LocalDateTime finOperativo(SalidaProgramada salida) {
        try { return fin(salida).plusMinutes(60); }
        catch (DateTimeException | ArithmeticException ex) {
            throw error(HttpStatus.BAD_REQUEST, "La fecha y el buffer operativo producen una hora final fuera de rango");
        }
    }

    private void validarDatos(SalidaProgramada salida, boolean creacion) {
        if (salida == null || salida.getFecha() == null || salida.getHoraSalida() == null)
            throw error(HttpStatus.BAD_REQUEST, "La fecha y hora de salida son obligatorias");
        HorizonteOperativo.validar(salida.getFecha());
        if (salida.getHoraSalida().isBefore(LocalTime.of(6, 0))
                || salida.getHoraSalida().isAfter(LocalTime.of(19, 0)))
            throw error(HttpStatus.BAD_REQUEST, "La hora de inicio debe estar entre 06:00 y 19:00 (America/Lima)");
        if (!inicio(salida).isAfter(LocalDateTime.now(ZONA)))
            throw error(HttpStatus.BAD_REQUEST, "La fecha y hora deben ser futuras en America/Lima");
        if (!creacion && (salida.getCuposDisponibles() == null || salida.getCuposDisponibles() < 0 || salida.getCuposDisponibles() > 100))
            throw error(HttpStatus.BAD_REQUEST, "Los cupos deben estar entre 0 y 100");
        if (salida.getTour() == null || salida.getEmbarcacion() == null)
            throw error(HttpStatus.BAD_REQUEST, "El tour y la embarcación son obligatorios");
        validarId(salida.getTour().getId());
        validarId(salida.getEmbarcacion().getId());
    }

    private void validarEstadoEstructural(SalidaProgramada salida) {
        if (salida.getEstado() != null && salida.getEstado() != EstadoSalida.PROGRAMADA)
            throw error(HttpStatus.BAD_REQUEST, "La salida se crea como PROGRAMADA; para cambiar su estado utiliza PATCH");
    }

    private static void validarId(Long id) {
        if (id == null || id <= 0) throw error(HttpStatus.BAD_REQUEST, "El ID debe ser un entero positivo");
    }

    private void validarExistenciaTour(Long id) {
        validarId(id);
        if (!tours.existsById(id)) throw error(HttpStatus.NOT_FOUND, "El tour indicado no existe");
    }

    private static ResponseStatusException error(HttpStatus estado, String mensaje) {
        return new ResponseStatusException(estado, mensaje);
    }
}
