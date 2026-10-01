package com.seatour.seatour.config;

import com.seatour.seatour.service.CorreoReservaJob;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class CorreoDiagnostico implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(CorreoDiagnostico.class);
    private final Environment entorno;
    private final ObjectProvider<CorreoReservaJob> job;
    public CorreoDiagnostico(Environment entorno, ObjectProvider<CorreoReservaJob> job) {
        this.entorno = entorno; this.job = job;
    }
    @Override
    public void run(ApplicationArguments args) {
        if (job.getIfAvailable() == null) {
            log.warn("Correo de reservas INACTIVO. SEATOUR_CORREO_HABILITADO no es true en este proceso. "
                    + "Si cambiaste variables permanentes de Windows, reinicia el IDE/terminal y el backend. "
                    + "Los comprobantes permanecen pendientes.");
            return;
        }
        log.info("Correo de reservas ACTIVO. SMTP host={}, puerto={}, auth={}, STARTTLS={}, STARTTLS requerido={}",
                entorno.getProperty("spring.mail.host"), entorno.getProperty("spring.mail.port"),
                entorno.getProperty("spring.mail.properties.mail.smtp.auth"),
                entorno.getProperty("spring.mail.properties.mail.smtp.starttls.enable"),
                entorno.getProperty("spring.mail.properties.mail.smtp.starttls.required"));
        if (entorno.getProperty("spring.mail.username", "").isBlank()
                || entorno.getProperty("spring.mail.password", "").isBlank())
            log.warn("Credenciales SMTP incompletas en el proceso. Revisa SEATOUR_SMTP_USUARIO y SEATOUR_SMTP_PASSWORD.");
    }
}
