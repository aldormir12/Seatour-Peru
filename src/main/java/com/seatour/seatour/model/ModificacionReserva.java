package com.seatour.seatour.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

/** Libro histórico: nunca cambia el pago original ni representa operaciones con una pasarela. */
@Entity
@Table(name = "reserva_modificaciones", indexes = @Index(name = "idx_modificacion_reserva", columnList = "reserva_id"))
public class ModificacionReserva {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reserva_id", nullable = false, updatable = false) private Reserva reserva;
    @Column(nullable = false, updatable = false) private Long actorId;
    @Column(nullable = false, updatable = false) private String actorRol;
    @Column(nullable = false, updatable = false) private Instant creadaEn;
    @Column(nullable = false, precision = 19, scale = 2, updatable = false) private BigDecimal totalAnterior;
    @Column(nullable = false, precision = 19, scale = 2, updatable = false) private BigDecimal totalNuevo;
    @Column(nullable = false, precision = 19, scale = 2, updatable = false) private BigDecimal ajusteSimulado;
    @Column(nullable = false, updatable = false) private String tipo;
    @Column(nullable = false, columnDefinition = "text", updatable = false) private String detalleAnterior;
    @Column(nullable = false, columnDefinition = "text", updatable = false) private String detalleNuevo;
    protected ModificacionReserva() {}
    public ModificacionReserva(Reserva reserva, Long actorId, String actorRol, BigDecimal anterior,
            BigDecimal nuevo, boolean pagada, String detalleAnterior, String detalleNuevo) {
        this.reserva = reserva; this.actorId = actorId; this.actorRol = actorRol; creadaEn = Instant.now();
        totalAnterior = anterior; totalNuevo = nuevo;
        ajusteSimulado = pagada ? nuevo.subtract(anterior) : BigDecimal.ZERO;
        tipo = !pagada ? "REVALORIZACION" : ajusteSimulado.signum() > 0 ? "COBRO_ADICIONAL_SIMULADO"
                : ajusteSimulado.signum() < 0 ? "REEMBOLSO_SIMULADO" : "SIN_AJUSTE";
        this.detalleAnterior = detalleAnterior; this.detalleNuevo = detalleNuevo;
    }
    public Long getId() { return id; }
    public Long getActorId() { return actorId; }
    public String getActorRol() { return actorRol; }
    public Instant getCreadaEn() { return creadaEn; }
    public BigDecimal getTotalAnterior() { return totalAnterior; }
    public BigDecimal getTotalNuevo() { return totalNuevo; }
    public BigDecimal getAjusteSimulado() { return ajusteSimulado; }
    public String getTipo() { return tipo; }
    public String getDetalleAnterior() { return detalleAnterior; }
    public String getDetalleNuevo() { return detalleNuevo; }
}
