package com.seatour.seatour.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class InicioAutomaticoSalidas {
    private static final Logger log = LoggerFactory.getLogger(InicioAutomaticoSalidas.class);
    private final SalidaProgramadaService salidas;

    public InicioAutomaticoSalidas(SalidaProgramadaService salidas) {
        this.salidas = salidas;
    }

    @Scheduled(cron = "*/30 * * * * *", zone = "America/Lima")
    public void iniciarPendientes() {
        for (Long id : salidas.listarPendientesDeInicio()) {
            try {
                // Una transacción por salida: un conflicto no bloquea las demás.
                salidas.iniciarAutomaticamente(id);
            } catch (RuntimeException e) {
                log.warn("No se pudo iniciar automáticamente la salida {}: {}", id, e.getMessage());
            }
        }
    }
}
