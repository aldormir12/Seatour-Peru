package com.seatour.seatour.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OperadorPassword(@NotBlank @Size(max = 1024) String password) {
    @Override
    public String toString() {
        return "OperadorPassword[datos omitidos]";
    }
}
