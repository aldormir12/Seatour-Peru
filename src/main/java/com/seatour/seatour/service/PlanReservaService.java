package com.seatour.seatour.service;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.EstadoPago;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.List;

@Service
public class PlanReservaService {
    private final ReservaService reservas;
    private final PagoService pagos;
    public PlanReservaService(ReservaService reservas, PagoService pagos) {
        this.reservas = reservas;
        this.pagos = pagos;
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public PlanReservaPagoRespuesta pagar(PlanReservaPagoSolicitud datos, LoginRespuesta actor) {
        var seleccion = datos.seleccion();
        var salidas = reservas.bloquearPlan(seleccion, actor);
        var anteriores = reservas.reservasDelPlan(datos.operacionId(), actor);
        if (!anteriores.isEmpty()) {
            var ids = seleccion.items().stream().map(PlanReservaSeleccion.Item::salidaId).sorted().toList();
            if (!anteriores.stream().map(ReservaRespuesta::salidaId).sorted().toList().equals(ids)
                    || anteriores.stream().anyMatch(r -> !java.util.Objects.equals(r.ninos(), seleccion.composicion().ninos())
                        || !java.util.Objects.equals(r.adultos(), seleccion.composicion().adultos())
                        || !java.util.Objects.equals(r.adultosMayores(), seleccion.composicion().adultosMayores())
                        || !r.adicionales().stream().map(ReservaAdicionalRespuesta::adicionalId).sorted().toList()
                            .equals((seleccion.adicionalesIds() == null ? List.<Long>of() : seleccion.adicionalesIds()).stream().sorted().toList())))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Este identificador ya pertenece a otro plan");
            // Reintento de la misma operación: no vuelve a reservar ni a cobrar.
            return aprobada(anteriores);
        }
        var resumen = reservas.resumenPlanBloqueado(salidas, seleccion.composicion(), seleccion.adicionalesIds());
        if (seleccion.subtotalAdicionalesEsperado() == null
                || seleccion.subtotalAdicionalesEsperado().compareTo(resumen.subtotalAdicionales()) != 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El precio de los adicionales cambió. Revisa el resumen antes de pagar");
        if (!resumen.disponible()) {
            String problemas = resumen.items().stream().filter(i -> i.problema() != null)
                    .map(i -> i.tourNombre() + ": " + i.problema() + ". Quedan " + i.cuposDisponibles() + " cupos")
                    .collect(java.util.stream.Collectors.joining("; "));
            throw new ResponseStatusException(HttpStatus.CONFLICT, problemas);
        }
        for (var item : resumen.items()) {
            var esperado = seleccion.items().stream().filter(i -> i.salidaId().equals(item.salidaId())).findFirst().orElseThrow().precioEsperado();
            if (esperado == null || esperado.compareTo(item.subtotal()) != 0)
                throw new ResponseStatusException(HttpStatus.CONFLICT, item.tourNombre() + ": el precio cambió. Revisa el resumen antes de pagar");
        }
        var creadas = new java.util.ArrayList<ReservaRespuesta>();
        // La selección y pasajeros son comunes: cada reserva tiene el mismo subtotal de adicionales.
        var extrasPorReserva = resumen.subtotalAdicionales().divide(BigDecimal.valueOf(resumen.items().size()));
        for (var item : resumen.items()) {
            var composicion = seleccion.composicion();
            var reserva = reservas.crear(new ReservaCreacion(item.salidaId(), composicion.ninos(), composicion.adultos(), composicion.adultosMayores(),
                    item.subtotal().add(extrasPorReserva), seleccion.adicionalesIds()), actor);
            reservas.asociarPlan(reserva.id(), datos.operacionId());
            creadas.add(reserva);
        }
        for (var reserva : creadas) {
            var pago = pagos.pagar(reserva.id(), datos.pago(), actor);
            if (pago.estadoPago() != EstadoPago.APROBADO)
                throw new PagoPlanRechazado(pago.motivoRechazo());
        }
        return aprobada(creadas.stream().map(r -> reservas.consultar(r.id(), actor)).toList());
    }

    private PlanReservaPagoRespuesta aprobada(List<ReservaRespuesta> lista) {
        return new PlanReservaPagoRespuesta(EstadoPago.APROBADO, "Plan reservado: todas las experiencias tienen su reserva individual",
                lista, lista.stream().map(ReservaRespuesta::precioTotal).reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    // Sale de la transacción antes de responder al cliente: revierte reservas, cupos, pagos y avisos.
    public static class PagoPlanRechazado extends RuntimeException {
        public PagoPlanRechazado(String motivo) { super(motivo == null ? "Pago rechazado" : motivo); }
    }
}
