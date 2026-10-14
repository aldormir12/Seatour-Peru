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
    // Identifica únicamente las reservas de un checkout del Plan del día y sus reintentos.
    @Column(name = "plan_operacion_id", length = 36)
    private String planOperacionId;
    public void asociarPlan(java.util.UUID operacionId) { this.planOperacionId = operacionId.toString(); }
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false, updatable = false)
    private Usuario cliente;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "salida_id", nullable = false, updatable = false)
    private SalidaProgramada salida;
    @Column(nullable = false)
    private int pasajeros;
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal precioUnitario;
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal precioTotal;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private EstadoReserva estado;
    @Column(nullable = false, updatable = false)
    private Instant creadaEn;
    private Instant confirmadaEn;
    private Instant canceladaEn;

    @Column private Integer ninos;
    @Column private Integer adultos;
    @Column private Integer adultosMayores;
    @OneToMany(mappedBy = "reserva", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private java.util.List<ReservaAdicional> adicionales = new java.util.ArrayList<>();
    @Column(precision = 19, scale = 2) private BigDecimal subtotalAdicionales;
    public void agregarAdicionales(java.util.List<ReservaAdicional> elegidos) {
        if (id != null || !adicionales.isEmpty()) throw new IllegalStateException("La reserva ya fue configurada");
        elegidos.forEach(a -> { a.asociar(this); adicionales.add(a); });
        subtotalAdicionales = elegidos.stream().map(ReservaAdicional::getSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        precioTotal = precioTotal.add(subtotalAdicionales);
    }
    public java.util.List<ReservaAdicional> getAdicionales() { return java.util.Collections.unmodifiableList(adicionales); }
    public BigDecimal getSubtotalAdicionales() { return subtotalAdicionales == null ? BigDecimal.ZERO : subtotalAdicionales; }
    protected Reserva() {}
    public Reserva(Usuario cliente, SalidaProgramada salida, BigDecimal base,
            int ninos, int adultos, int adultosMayores, BigDecimal total) {
        this(cliente, salida, ninos + adultos + adultosMayores, base);
        this.ninos = ninos; this.adultos = adultos; this.adultosMayores = adultosMayores;
        this.precioTotal = total;
    }
    public Integer getNinos() { return ninos; }
    public Integer getAdultos() { return adultos; }
    public Integer getAdultosMayores() { return adultosMayores; }
    public Reserva(Usuario cliente, SalidaProgramada salida, int pasajeros, BigDecimal precio) {
        this.cliente = cliente;
        this.salida = salida;
        this.pasajeros = pasajeros;
        this.precioUnitario = precio;
        this.precioTotal = precio.multiply(BigDecimal.valueOf(pasajeros));
        this.estado = EstadoReserva.PENDIENTE;
        this.creadaEn = Instant.now();
    }
    // Solo las reservas activas al reprogramar reciben este derecho; las anteriores quedan null.
    @Column(name = "cancelacion_excepcional_hasta")
    private java.time.LocalDateTime cancelacionExcepcionalHasta;
    public java.time.LocalDateTime getCancelacionExcepcionalHasta() { return cancelacionExcepcionalHasta; }
    public void habilitarCancelacionPorReprogramacion(java.time.LocalDateTime nuevoInicio) {
        if (estado == EstadoReserva.PENDIENTE || estado == EstadoReserva.CONFIRMADA)
            cancelacionExcepcionalHasta = nuevoInicio.minusHours(2);
    }
    // Nullable para mantener compatibilidad con las filas existentes; se interpreta como revisión cero.
    @Column private Long revision;
    @Column(columnDefinition = "text") private String planSeleccionOriginal;
    public long getRevision() { return revision == null ? 0L : revision; }
    public boolean perteneceAPlan() { return planOperacionId != null; }
    public String getPlanSeleccionOriginal() { return planSeleccionOriginal; }
    public void guardarSeleccionOriginalPlan(String seleccion) {
        if (planSeleccionOriginal == null) planSeleccionOriginal = seleccion;
    }
    public void limpiarAdicionalesParaModificacion() { adicionales.clear(); }
    public void modificar(int ninos, int adultos, int mayores, BigDecimal base, BigDecimal subtotal,
            java.util.List<ReservaAdicional> elegidos) {
        this.ninos = ninos; this.adultos = adultos; adultosMayores = mayores;
        pasajeros = ninos + adultos + mayores; precioUnitario = base;
        elegidos.forEach(a -> { a.asociar(this); adicionales.add(a); });
        subtotalAdicionales = elegidos.stream().map(ReservaAdicional::getSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        precioTotal = subtotal.add(subtotalAdicionales); revision = Math.addExact(getRevision(), 1L);
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
