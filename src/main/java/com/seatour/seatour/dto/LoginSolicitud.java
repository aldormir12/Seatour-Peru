package com.seatour.seatour.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginSolicitud(
        @NotBlank @Email @Size(max = 255) String correo,
        @NotBlank @Size(max = 1024) String password) {
    @Override
    public String toString() {
        return "LoginSolicitud[datos omitidos]";
    }
}
