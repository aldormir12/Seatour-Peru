package com.seatour.seatour.dto;

import jakarta.validation.constraints.*;

public record ComposicionPasajeros(
        @NotNull @Min(0) @Max(100) Integer ninos,
        @NotNull @Min(0) @Max(100) Integer adultos,
        @NotNull @Min(0) @Max(100) Integer adultosMayores) {
    public int totalPasajeros() { return ninos + adultos + adultosMayores; }
    public boolean esValida() {
        return ninos != null && adultos != null && adultosMayores != null
                && ninos >= 0 && ninos <= 100 && adultos >= 0 && adultos <= 100
                && adultosMayores >= 0 && adultosMayores <= 100
                && totalPasajeros() >= 1 && totalPasajeros() <= 100;
    }
}
