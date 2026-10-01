package com.seatour.seatour.dto;

import java.time.LocalTime;
import java.util.List;

public record RecomendacionRespuesta(Long tourId, String tourNombre, int score,
        Long mejorSalidaId, LocalTime mejorHora, List<String> razones) {}
