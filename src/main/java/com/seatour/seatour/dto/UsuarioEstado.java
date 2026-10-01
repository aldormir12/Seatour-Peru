package com.seatour.seatour.dto;

import jakarta.validation.constraints.NotNull;

public record UsuarioEstado(@NotNull Boolean activo) {}
