package com.seatour.seatour.service;

import com.seatour.seatour.model.EstadoReserva;
import com.seatour.seatour.repository.ComprobanteReservaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.javamail.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

@Component
@ConditionalOnProperty(name = "seatour.correo.habilitado", havingValue = "true")
public class CorreoReservaJob {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CorreoReservaJob.class);
    private final ComprobanteReservaRepository comprobantes;
    private final JavaMailSender correo;
    private final String remitente;
    public CorreoReservaJob(ComprobanteReservaRepository comprobantes, JavaMailSender correo,
            @Value("${seatour.correo.remitente}") String remitente) {
        this.comprobantes = comprobantes; this.correo = correo; this.remitente = remitente;
        if (remitente.isBlank()) throw new IllegalArgumentException("Configura SEATOUR_CORREO_REMITENTE");
    }
    // Solo ve comprobantes cuya transaccion de pago ya hizo commit. El bloqueo evita envios concurrentes.
    @Scheduled(fixedDelayString = "${seatour.correo.intervalo-ms:15000}")
    @Transactional
    public void enviarPendientes() {
        var pendientes = comprobantes.pendientes(Instant.now(), PageRequest.of(0, 5));
        if (!pendientes.isEmpty()) log.info("Correo de reservas: {} comprobantes pendientes detectados", pendientes.size());
        for (var c : pendientes) {
            if (c.getReserva().getEstado() != EstadoReserva.CONFIRMADA) { c.omitir(); continue; }
            try {
                var mensaje = correo.createMimeMessage();
                var helper = new MimeMessageHelper(mensaje, true, "UTF-8");
                helper.setFrom(remitente); helper.setTo(c.getDestinatario());
                helper.setSubject("SEATOUR | Reserva confirmada | " + c.getCodigo());
                helper.setText(c.getTexto(), c.getHtml());
                helper.addInline("reserva-qr", new ByteArrayResource(c.getQr()), "image/png");
                helper.addAttachment("reserva-qr.png", new ByteArrayResource(c.getQr()), "image/png");
                correo.send(mensaje);
                c.enviado();
                log.info("Comprobante {} aceptado por SMTP", c.getId());
            } catch (Exception e) {
                c.fallido();
                // No registrar correo, token ni detalles SMTP potencialmente sensibles.
                Throwable causa = e;
                for (int i = 0; i < 10 && causa.getCause() != null && causa.getCause() != causa; i++) causa = causa.getCause();
                String orientacion = e instanceof org.springframework.mail.MailAuthenticationException
                        ? "Autenticacion SMTP rechazada: revisar usuario y contrasena de aplicacion de Gmail."
                        : "Revisar conexion SMTP, TLS y autorizacion del remitente.";
                log.warn("No se pudo enviar el comprobante {}. Se reintentara. Tipo: {}. Causa: {}. {}",
                        c.getId(), e.getClass().getSimpleName(), causa.getClass().getSimpleName(), orientacion);
            }
        }
    }
}
