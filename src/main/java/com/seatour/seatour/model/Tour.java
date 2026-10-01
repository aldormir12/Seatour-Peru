package com.seatour.seatour.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

@Entity
@Table(name = "tours")
public class Tour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre del tour es obligatorio")
    @Column(nullable = false)
    private String nombre;

    @NotBlank(message = "La descripción del tour es obligatoria")
    @Column(nullable = false, length = 1000)
    private String descripcion;

    @Column(length = 2048)
    private String imagenUrl;

    // Nullable para conservar tours anteriores; los DTO exigen ubicación al guardar.
    @Enumerated(EnumType.STRING)
    @Column(name = "zona_maritima", length = 30)
    private ZonaMaritima zonaMaritima;

    public ZonaMaritima getZonaMaritima() { return zonaMaritima; }

    public void setZonaMaritima(ZonaMaritima zonaMaritima) { this.zonaMaritima = zonaMaritima; }

    public String getImagenUrl() {
        return imagenUrl;
    }

    public void setImagenUrl(String imagenUrl) {
        this.imagenUrl = imagenUrl == null ? null : imagenUrl.trim();
    }

    @NotNull(message = "La duración es obligatoria")
    @Positive(message = "La duración debe ser mayor a cero")
    @Column(nullable = false)
    private Integer duracionMinutos;

    @NotNull(message = "El precio base es obligatorio")
    @Positive(message = "El precio debe ser mayor a cero")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precioBase;

    @NotNull(message = "El estado del tour es obligatorio")
    @Column(nullable = false)
    private Boolean activo;

    // relacion muchos a uno
    @NotNull(message = "La categoría del tour es obligatoria")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_tour_id", nullable = false)
    private CategoriaTour categoriaTour;

    public Tour() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Integer getDuracionMinutos() {
        return duracionMinutos;
    }

    public void setDuracionMinutos(Integer duracionMinutos) {
        this.duracionMinutos = duracionMinutos;
    }

    public BigDecimal getPrecioBase() {
        return precioBase;
    }

    public void setPrecioBase(BigDecimal precioBase) {
        this.precioBase = precioBase;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }

    public CategoriaTour getCategoriaTour() {
        return categoriaTour;
    }

    public void setCategoriaTour(CategoriaTour categoriaTour) {
        this.categoriaTour = categoriaTour;
    }
}
