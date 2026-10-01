package com.seatour.seatour.dto;

import java.time.Instant;

public record LiveTokenRespuesta(String url, String token, String room, String identity, Instant expiresAt) {}
