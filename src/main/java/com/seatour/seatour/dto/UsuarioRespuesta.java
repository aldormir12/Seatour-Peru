package com.seatour.seatour.dto;

import com.seatour.seatour.model.Usuario;

public record UsuarioRespuesta(Long id, String nombre, String apellido, String correo,
                               boolean activo, String rol) {
    public static UsuarioRespuesta desde(Usuario usuario) {
        return new UsuarioRespuesta(usuario.getId(), usuario.getNombre(), usuario.getApellido(),
                usuario.getCorreo(), usuario.isActivo(), usuario.getRol().getNombre());
    }
}
