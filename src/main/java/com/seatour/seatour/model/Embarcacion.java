package com.seatour.seatour.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Entity
@Table(name = "embarcaciones")
public class Embarcacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre de la embarcación es obligatorio")
    @Column(nullable = false)
    private String nombre;

    @NotBlank(message = "La matrícula es obligatoria")
    @Column(nullable = false, unique = true)
    private String matricula;

    @NotNull(message = "La capacidad es obligatoria")
    @Positive(message = "La capacidad debe ser mayor a cero")
    @Column(nullable = false)
    private Integer capacidad;

    @NotBlank(message = "El estado de la embarcación es obligatorio")
    @Column(nullable = false)
    private String estado;

    // Columnas inicialmente opcionales para conservar registros anteriores a la API ADMIN.
    // Los DTOs exigen tipo e imagen en todas las altas y ediciones.
    private String tipo;

    private Boolean activo;

    @Column(name = "imagen_url", length = 2048)
    private String imagenUrl;

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public Boolean getActivo() {
        return activo != null ? activo : "ACTIVA".equalsIgnoreCase(estado);
    }
    public void setActivo(Boolean activo) {
        this.activo = activo;
        this.estado = Boolean.TRUE.equals(activo) ? "ACTIVA" : "INACTIVA";
    }
    public String getImagenUrl() { return imagenUrl; }
    public void setImagenUrl(String imagenUrl) { this.imagenUrl = imagenUrl; }

    public Embarcacion() {
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

    public String getMatricula() {
        return matricula;
    }

    public void setMatricula(String matricula) {
        this.matricula = matricula;
    }

    public Integer getCapacidad() {
        return capacidad;
    }

    public void setCapacidad(Integer capacidad) {
        this.capacidad = capacidad;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
        this.activo = "ACTIVA".equalsIgnoreCase(estado);
    }
}
