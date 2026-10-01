package com.seatour.seatour.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OperadorEdicion(
        @NotBlank @Size(max = 255) String nombre,
        @NotBlank @Size(max = 255) String apellido,
        @NotBlank @Email @Size(max = 255) String correo) {
}
