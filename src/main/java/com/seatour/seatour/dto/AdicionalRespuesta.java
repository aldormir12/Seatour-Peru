package com.seatour.seatour.dto;
import com.seatour.seatour.model.*;
import java.math.BigDecimal;
public record AdicionalRespuesta(Long id, String nombre, String descripcion, BigDecimal precio, TipoCobro tipoCobro, boolean activo) {
    public static AdicionalRespuesta desde(Adicional a) {
        return new AdicionalRespuesta(a.getId(), a.getNombre(), a.getDescripcion(), a.getPrecio(), a.getTipoCobro(), a.isActivo());
    }
}
