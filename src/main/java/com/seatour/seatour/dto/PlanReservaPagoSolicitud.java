package com.seatour.seatour.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record PlanReservaPagoSolicitud(@NotNull UUID operacionId,
        @NotNull @Valid PlanReservaSeleccion seleccion, @NotNull PagoSolicitud pago) {
    @Override public String toString() { return "PlanReservaPagoSolicitud[datos omitidos]"; }
}
