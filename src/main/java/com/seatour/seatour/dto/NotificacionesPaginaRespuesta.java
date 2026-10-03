package com.seatour.seatour.dto;

import java.util.List;

public record NotificacionesPaginaRespuesta(List<NotificacionRespuesta> notificaciones,
        int pagina, int tamanio, long totalElementos, int totalPaginas) {}
