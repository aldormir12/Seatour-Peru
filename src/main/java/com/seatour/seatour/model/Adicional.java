package com.seatour.seatour.model;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.*;
@Entity
@Table(name = "adicionales")
public class Adicional {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 150) private String nombre;
    @Column(length = 500) private String descripcion;
    @Column(precision = 19, scale = 2) private BigDecimal precio;
    @Enumerated(EnumType.STRING) private TipoCobro tipoCobro;
    @Column(nullable = false) private boolean activo;
    @ManyToMany
    @JoinTable(name = "tour_adicionales", joinColumns = @JoinColumn(name = "adicional_id"),
            inverseJoinColumns = @JoinColumn(name = "tour_id"))
    private Set<Tour> tours = new HashSet<>();
    protected Adicional() {}
    public Adicional(String nombre) { this.nombre = nombre; this.descripcion = nombre; }
    public void configurar(String nombre, String descripcion, BigDecimal precio, TipoCobro tipo, boolean activo, Collection<Tour> tours) {
        this.nombre = nombre.strip(); this.descripcion = descripcion == null ? "" : descripcion.strip();
        this.precio = precio; this.tipoCobro = tipo; this.activo = activo;
        this.tours.clear(); this.tours.addAll(tours);
    }
    public Long getId() { return id; }
    public void asociarTours(Collection<Tour> tours) { this.tours.addAll(tours); }
    public String getNombre() { return nombre; }
    public String getDescripcion() { return descripcion; }
    public BigDecimal getPrecio() { return precio; }
    public TipoCobro getTipoCobro() { return tipoCobro; }
    public boolean isActivo() { return activo; }
    public Set<Tour> getTours() { return Collections.unmodifiableSet(tours); }
}
