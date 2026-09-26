package com.seatour.seatour.dto;

public record LoginTokenRespuesta(Long id, String nombre, String correo, String rol, String token) {
    public static LoginTokenRespuesta desde(LoginRespuesta usuario, String token) {
        return new LoginTokenRespuesta(usuario.id(), usuario.nombre(), usuario.correo(), usuario.rol(), token);
    }

    @Override
    public String toString() {
        return "LoginTokenRespuesta[datos omitidos]";
    }
}
