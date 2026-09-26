package com.seatour.seatour.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "reservas", indexes = {
        @Index(name = "idx_reserva_cliente", columnList = "cliente_id"),
        @Index(name = "idx_reserva_salida", columnList = "salida_id")
})
public class Reserva {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false, updatable = false)
    private Usuario cliente;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "salida_id", nullable = false, updatable = false)
    private SalidaProgramada salida;
    @Column(nullable = false, updatable = false)
    private int pasajeros;
    @Column(nullable = false, updatable = false, precision = 19, scale = 2)
    private BigDecimal precioUnitario;
    @Column(nullable = false, updatable = false, precision = 19, scale = 2)
    private BigDecimal precioTotal;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private EstadoReserva estado;
    @Column(nullable = false, updatable = false)
    private Instant creadaEn;
    private Instant confirmadaEn;
    private Instant canceladaEn;

    protected Reserva() {}
    public Reserva(Usuario cliente, SalidaProgramada salida, int pasajeros, BigDecimal precio) {
        this.cliente = cliente;
        this.salida = salida;
        this.pasajeros = pasajeros;
        this.precioUnitario = precio;
        this.precioTotal = precio.multiply(BigDecimal.valueOf(pasajeros));
        this.estado = EstadoReserva.PENDIENTE;
        this.creadaEn = Instant.now();
    }
    public void confirmar() { estado = EstadoReserva.CONFIRMADA; confirmadaEn = Instant.now(); }
    public void cancelar() { estado = EstadoReserva.CANCELADA; canceladaEn = Instant.now(); }
    public Long getId() { return id; }
    public Usuario getCliente() { return cliente; }
    public SalidaProgramada getSalida() { return salida; }
    public int getPasajeros() { return pasajeros; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public BigDecimal getPrecioTotal() { return precioTotal; }
    public EstadoReserva getEstado() { return estado; }
    public Instant getCreadaEn() { return creadaEn; }
    public Instant getConfirmadaEn() { return confirmadaEn; }
    public Instant getCanceladaEn() { return canceladaEn; }
}
