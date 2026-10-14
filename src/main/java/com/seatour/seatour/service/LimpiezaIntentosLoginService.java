package com.seatour.seatour.service;

import com.seatour.seatour.repository.IntentoLoginRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.Instant;

@Service
public class LimpiezaIntentosLoginService {
    private final IntentoLoginRepository intentos;
    public LimpiezaIntentosLoginService(IntentoLoginRepository intentos) { this.intentos = intentos; }

    // Lotes cortos: los registros con actividad de los últimos 30 días permanecen.
    @Scheduled(initialDelay = 300000, fixedDelay = 300000)
    @Transactional
    public void limpiar() {
        Instant ahora = Instant.now();
        intentos.limpiarAntiguos(ahora.minus(Duration.ofDays(30)), ahora);
    }
}
