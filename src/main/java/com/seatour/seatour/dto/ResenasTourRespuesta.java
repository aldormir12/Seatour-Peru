package com.seatour.seatour.dto;

import java.math.BigDecimal;
import java.util.List;

public record ResenasTourRespuesta(Long tourId, BigDecimal promedio, long cantidad,
        List<ResenaRespuesta> resenas) {}
