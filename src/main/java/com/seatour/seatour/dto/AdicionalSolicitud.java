package com.seatour.seatour.dto;
import com.seatour.seatour.model.TipoCobro;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.Set;
public record AdicionalSolicitud(@NotBlank @Size(max = 150) String nombre, @Size(max = 500) String descripcion,
        @NotNull @DecimalMin("0.00") @Digits(integer = 17, fraction = 2) BigDecimal precio,
        @NotNull TipoCobro tipoCobro, @NotNull Boolean activo,
        @NotNull @Size(max = 1000) Set<@NotNull @Positive Long> tourIds) {}
