package com.seatour.seatour.dto;

import jakarta.validation.constraints.NotNull;

public record EmbarcacionEstado(@NotNull(message = "El estado activo es obligatorio") Boolean activo) {}
