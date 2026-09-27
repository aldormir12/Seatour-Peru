package com.seatour.seatour.dto;

import com.seatour.seatour.model.CategoriaTour;

public record CategoriaTourRespuesta(Long id, String nombre, String descripcion, Boolean activo) {
    public static CategoriaTourRespuesta desde(CategoriaTour categoria) {
        return new CategoriaTourRespuesta(categoria.getId(), categoria.getNombre(),
                categoria.getDescripcion(), categoria.getActivo());
    }
}
