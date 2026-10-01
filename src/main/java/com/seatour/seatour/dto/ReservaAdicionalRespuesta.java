package com.seatour.seatour.dto;
import com.seatour.seatour.model.*;
import java.math.BigDecimal;
public record ReservaAdicionalRespuesta(Long adicionalId, String nombre, String descripcion, TipoCobro tipoCobro,
        int cantidad, BigDecimal precioUnitario, BigDecimal subtotal) {
    public static ReservaAdicionalRespuesta desde(ReservaAdicional a) {
        return new ReservaAdicionalRespuesta(a.getAdicionalId(), a.getNombre(), a.getDescripcion(), a.getTipoCobro(),
                a.getCantidad(), a.getPrecioUnitario(), a.getSubtotal());
    }
}
