package com.seatour.seatour.model;

import jakarta.persistence.*;
import java.time.Instant;

/** Comprobante y salida de correo persistidos en la misma transaccion que el pago. */
@Entity
@Table(name = "comprobantes_reserva")
public class ComprobanteReserva {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reserva_id", nullable = false, unique = true, updatable = false)
    private Reserva reserva;
    @Column(nullable = false, unique = true, updatable = false, length = 40) private String codigo;
    @Column(nullable = false, updatable = false) private String destinatario;
    @Column(nullable = false, updatable = false, columnDefinition = "text") private String html;
    @Column(nullable = false, updatable = false, columnDefinition = "text") private String texto;
    @Column(nullable = false, updatable = false, columnDefinition = "bytea") private byte[] qr;
    @Column(nullable = false, updatable = false) private Instant creadoEn;
    private Instant enviadoEn;
    private Instant omitidoEn;
    @Column(nullable = false) private Instant proximoIntento;
    @Column(nullable = false) private int intentos;
    protected ComprobanteReserva() {}
    public ComprobanteReserva(Reserva reserva, String codigo, String texto, String html, byte[] qr) {
        this.reserva = reserva; this.codigo = codigo;
        this.destinatario = reserva.getCliente().getCorreo();
        this.texto = texto; this.html = html; this.qr = qr;
        this.creadoEn = Instant.now(); this.proximoIntento = creadoEn;
    }
    public void enviado() { intentos++; enviadoEn = Instant.now(); }
    public void fallido() { intentos++; proximoIntento = Instant.now().plusSeconds(Math.min(3600L, 60L * intentos)); }
    public void omitir() { omitidoEn = Instant.now(); }
    public Long getId() { return id; }
    public Reserva getReserva() { return reserva; }
    public String getCodigo() { return codigo; }
    public String getDestinatario() { return destinatario; }
    public String getHtml() { return html; }
    public String getTexto() { return texto; }
    public byte[] getQr() { return qr.clone(); }
}
