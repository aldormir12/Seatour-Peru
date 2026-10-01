package com.seatour.seatour.service;

import com.seatour.seatour.dto.DashboardAdminRespuesta;
import com.seatour.seatour.dto.DashboardAdminRespuesta.*;
import com.seatour.seatour.model.*;
import com.seatour.seatour.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class DashboardAdminService {
    private static final ZoneId ZONA = ZoneId.of("America/Lima");
    private final PagoRepository pagos;
    private final ReservaRepository reservas;
    private final SalidaProgramadaRepository salidas;

    public DashboardAdminService(PagoRepository pagos, ReservaRepository reservas, SalidaProgramadaRepository salidas) {
        this.pagos = pagos; this.reservas = reservas; this.salidas = salidas;
    }

    public DashboardAdminRespuesta resumen(LocalDate desde, LocalDate hasta) {
        LocalDate fin = hasta == null ? LocalDate.now(ZONA) : hasta;
        LocalDate inicio = desde == null ? fin.withDayOfMonth(1) : desde;
        if (inicio.isAfter(fin) || fin.equals(LocalDate.MAX))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El período debe tener desde <= hasta y fechas válidas");
        Instant inicioInstante = inicio.atStartOfDay(ZONA).toInstant();
        Instant finExclusivo = fin.plusDays(1).atStartOfDay(ZONA).toInstant();

        var pagosPeriodo = pagos.findByEstadoAndCreadoEnGreaterThanEqualAndCreadoEnLessThan(
                EstadoPago.APROBADO, inicioInstante, finExclusivo);
        BigDecimal ingresos = BigDecimal.ZERO;
        Map<Long, IngresoTour> ingresosTour = new HashMap<>();
        Map<String, AdicionalVendido> adicionales = new HashMap<>();
        for (var pago : pagosPeriodo) {
            ingresos = ingresos.add(pago.getMonto());
            var reserva = pago.getReserva();
            var tour = reserva.getSalida().getTour();
            ingresosTour.compute(tour.getId(), (id, anterior) -> new IngresoTour(id, tour.getNombre(),
                    pago.getMonto().add(anterior == null ? BigDecimal.ZERO : anterior.ingresosRegistrados())));
            for (var adicional : reserva.getAdicionales()) {
                String clave = adicional.getAdicionalId() + ":" + adicional.getTipoCobro();
                adicionales.compute(clave, (id, anterior) -> new AdicionalVendido(adicional.getAdicionalId(),
                        adicional.getNombre(), adicional.getTipoCobro().name(),
                        adicional.getCantidad() + (anterior == null ? 0 : anterior.cantidad()),
                        adicional.getSubtotal().add(anterior == null ? BigDecimal.ZERO : anterior.importeRegistrado())));
            }
        }

        Map<Long, DemandaTour> demanda = new HashMap<>();
        for (var reserva : reservas.findByCreadaEnGreaterThanEqualAndCreadaEnLessThan(inicioInstante, finExclusivo)) {
            if (reserva.getEstado() == EstadoReserva.CANCELADA) continue;
            var tour = reserva.getSalida().getTour();
            demanda.compute(tour.getId(), (id, anterior) -> new DemandaTour(id, tour.getNombre(),
                    1 + (anterior == null ? 0 : anterior.reservas()),
                    reserva.getPasajeros() + (anterior == null ? 0 : anterior.pasajeros())));
        }
        var demandaOrdenada = demanda.values().stream()
                .sorted(Comparator.comparingLong(DemandaTour::pasajeros).reversed().thenComparing(DemandaTour::tourId)).toList();

        Map<Long, Long> pasajeros = new HashMap<>();
        for (Object[] fila : reservas.pasajerosPorSalidaEnPeriodo(inicio, fin, EstadoReserva.CANCELADA))
            pasajeros.put((Long) fila[0], ((Number) fila[1]).longValue());
        double sumaOcupacion = 0;
        long evaluables = 0, sinCapacidad = 0;
        var inicioReal = new AcumuladorDesviacion();
        var finReal = new AcumuladorDesviacion();
        for (var salida : salidas.findByFechaBetweenOrderByFechaAscHoraSalidaAsc(inicio, fin)) {
            if (salida.getEstado() == EstadoSalida.CANCELADA) continue;
            long ocupados = pasajeros.getOrDefault(salida.getId(), 0L);
            Integer libres = salida.getCuposDisponibles();
            long capacidad = libres == null ? 0 : ocupados + libres;
            if (libres != null && libres >= 0 && capacidad > 0) {
                sumaOcupacion += ocupados * 100.0 / capacidad;
                evaluables++;
            } else sinCapacidad++;
            var programado = LocalDateTime.of(salida.getFecha(), salida.getHoraSalida());
            inicioReal.agregar(programado, salida.getInicioReal());
            Integer duracion = salida.getTour().getDuracionMinutos();
            finReal.agregar(duracion == null || duracion <= 0 ? null : programado.plusMinutes(duracion), salida.getFinReal());
        }
        return new DashboardAdminRespuesta(inicio, fin, ZONA.getId(), "PEN", ingresos, pagosPeriodo.size(),
                evaluables == 0 ? null : sumaOcupacion / evaluables, evaluables, sinCapacidad,
                inicioReal.respuesta(), finReal.respuesta(), demandaOrdenada,
                ingresosTour.values().stream().sorted(Comparator.comparing(IngresoTour::ingresosRegistrados).reversed()
                        .thenComparing(IngresoTour::tourId)).toList(),
                demandaOrdenada.stream().limit(5).toList(),
                adicionales.values().stream().sorted(Comparator.comparingLong(AdicionalVendido::cantidad).reversed()
                        .thenComparing(AdicionalVendido::adicionalId).thenComparing(AdicionalVendido::tipoCobro)).toList(),
                List.of(
                        "Período inclusivo en America/Lima; por defecto mes actual hasta hoy.",
                        "Ingresos: pagos APROBADOS por fecha de pago. Son pagos simulados registrados, no cobros bancarios verificados. Incluyen adicionales y reservas posteriormente canceladas; no existe registro de reembolsos para calcular netos.",
                        "Demanda: reservas creadas en el período actualmente no canceladas, ordenadas por pasajeros. No representa una instantánea histórica de su estado.",
                        "Ocupación: media simple por salida no cancelada con fecha programada en el período; pasajeros de reservas no canceladas / (esos pasajeros + cupos disponibles). Incluye salidas aún programadas.",
                        "Puntualidad y precisión: desviación media firmada y error absoluto medio en minutos; positivo significa retraso. Sin porcentaje de puntualidad porque no existe tolerancia definida.",
                        "Operación: solo registros reales disponibles; inicio automático también registra inicioReal y no certifica salida física. El cierre estimado usa duración actual del tour, sin instantánea histórica de duración. Sin datos evaluables se devuelve null.",
                        "Adicionales: cantidades e importes históricos contratados en reservas con pago aprobado del período, agrupados por ID y tipo de cobro; incluye cancelaciones posteriores. No mezcla tipos de cobro del mismo adicional."));
    }

    private static class AcumuladorDesviacion {
        long cantidad, faltantes;
        double suma, sumaAbsoluta;
        void agregar(LocalDateTime previsto, LocalDateTime real) {
            if (previsto == null || real == null) { faltantes++; return; }
            double minutos = Duration.between(previsto, real).toMillis() / 60_000.0;
            cantidad++; suma += minutos; sumaAbsoluta += Math.abs(minutos);
        }
        Desviacion respuesta() {
            return new Desviacion(cantidad, faltantes, cantidad == 0 ? null : suma / cantidad,
                    cantidad == 0 ? null : sumaAbsoluta / cantidad);
        }
    }
}
