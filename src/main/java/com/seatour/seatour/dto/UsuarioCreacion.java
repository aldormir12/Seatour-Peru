package com.seatour.seatour.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UsuarioCreacion(
        @NotBlank @Size(max = 255) String nombre,
        @NotBlank @Size(max = 255) String apellido,
        @NotBlank @Email @Size(max = 255) String correo,
        @NotBlank @Size(max = 1024) String password) {

    @Override
    public String toString() {
        return "UsuarioCreacion[datos omitidos]";
    }
}
