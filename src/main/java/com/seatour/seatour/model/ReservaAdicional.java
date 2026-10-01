package com.seatour.seatour.model;
import jakarta.persistence.*;
import java.math.BigDecimal;
@Entity
@Table(name = "reserva_adicionales", uniqueConstraints = @UniqueConstraint(columnNames = {"reserva_id", "adicional_id"}))
public class ReservaAdicional {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reserva_id", nullable = false, updatable = false) private Reserva reserva;
    @Column(name = "adicional_id", nullable = false, updatable = false) private Long adicionalId;
    @Column(nullable = false, length = 150, updatable = false) private String nombre;
    @Column(length = 500, updatable = false) private String descripcion;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private TipoCobro tipoCobro;
    @Column(nullable = false, updatable = false) private int cantidad;
    @Column(nullable = false, precision = 19, scale = 2, updatable = false) private BigDecimal precioUnitario;
    @Column(nullable = false, precision = 19, scale = 2, updatable = false) private BigDecimal subtotal;
    protected ReservaAdicional() {}
    public ReservaAdicional(Adicional a, int pasajeros) {
        adicionalId = a.getId(); nombre = a.getNombre(); descripcion = a.getDescripcion(); tipoCobro = a.getTipoCobro();
        cantidad = tipoCobro == TipoCobro.POR_PERSONA ? pasajeros : 1;
        precioUnitario = a.getPrecio(); subtotal = precioUnitario.multiply(BigDecimal.valueOf(cantidad));
    }
    void asociar(Reserva reserva) { this.reserva = reserva; }
    public Long getAdicionalId() { return adicionalId; }
    public String getNombre() { return nombre; }
    public String getDescripcion() { return descripcion; }
    public TipoCobro getTipoCobro() { return tipoCobro; }
    public int getCantidad() { return cantidad; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public BigDecimal getSubtotal() { return subtotal; }
}
