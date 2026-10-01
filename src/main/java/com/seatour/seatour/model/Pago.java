package com.seatour.seatour.model;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "pagos")
public class Pago {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reserva_id", nullable = false, updatable = false) private Reserva reserva;
    // Solo los aprobados ocupan esta clave; admite multiples intentos rechazados.
    @Column(unique = true, updatable = false) private Long reservaAprobadaId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private MetodoPago metodo;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private EstadoPago estado;
    @Column(nullable = false, precision = 19, scale = 2, updatable = false) private BigDecimal monto;
    @Column(length = 4, updatable = false) private String ultimos4;
    @Column(length = 30, updatable = false) private String marca;
    @Column(updatable = false) private String motivoRechazo;
    @Column(nullable = false, updatable = false) private Instant creadoEn;
    protected Pago() {}
    public Pago(Reserva reserva, MetodoPago metodo, EstadoPago estado, String ultimos4, String marca) {
        this.reserva = reserva; this.metodo = metodo; this.estado = estado;
        this.monto = reserva.getPrecioTotal(); this.ultimos4 = ultimos4; this.marca = marca;
        this.reservaAprobadaId = estado == EstadoPago.APROBADO ? reserva.getId() : null;
        this.motivoRechazo = estado == EstadoPago.RECHAZADO ? "RECHAZO_SIMULADO" : null;
        this.creadoEn = Instant.now();
    }
    public Long getId() { return id; }
    public Reserva getReserva() { return reserva; }
    public Instant getCreadoEn() { return creadoEn; }
    public EstadoPago getEstado() { return estado; }
    public MetodoPago getMetodo() { return metodo; }
    public BigDecimal getMonto() { return monto; }
    public String getUltimos4() { return ultimos4; }
    public String getMarca() { return marca; }
    public String getMotivoRechazo() { return motivoRechazo; }
    public String getReferencia() { return "SIM-" + id; }
}
