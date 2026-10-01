package com.seatour.seatour.dto;
import com.seatour.seatour.model.MetodoPago;
public record PagoSolicitud(MetodoPago metodo, Tarjeta tarjeta, Yape yape) {
    public record Tarjeta(String numero, Integer mes, Integer anio, String cvv, String titular) {
        @Override public String toString() { return "Tarjeta[datos omitidos]"; }
    }
    public record Yape(String celular, String codigoAprobacion) {
        @Override public String toString() { return "Yape[datos omitidos]"; }
    }
    @Override public String toString() { return "PagoSolicitud[datos omitidos]"; }
}
