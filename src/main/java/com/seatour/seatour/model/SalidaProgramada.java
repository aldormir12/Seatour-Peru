package com.seatour.seatour.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "salidas_programadas", indexes = {
        @Index(name = "idx_salida_tour", columnList = "tour_id"),
        @Index(name = "idx_salida_embarcacion", columnList = "embarcacion_id"),
        @Index(name = "idx_salida_fecha", columnList = "fecha"),
        @Index(name = "idx_salida_estado", columnList = "estado")
})
public class SalidaProgramada {
    @Column(name = "es_demo", nullable = false, columnDefinition = "boolean default false")
    private boolean esDemo = false;
    public boolean isEsDemo() { return esDemo; }
    public void setEsDemo(boolean valor) { esDemo = valor; }

    private Boolean cambioOperativoConsumido = false;

    public boolean isCambioOperativoConsumido() {
        // Registros anteriores: conservar el límite si ya tienen trazabilidad de un cambio.
        return cambioOperativoConsumido != null ? cambioOperativoConsumido
                : fechaOriginal != null || !cambiosEmbarcacion.isEmpty();
    }

    public void consumirCambioOperativo() { cambioOperativoConsumido = true; }
    @ElementCollection
    @CollectionTable(name = "salida_cambios_embarcacion", joinColumns = @JoinColumn(name = "salida_id"))
    @OrderColumn(name = "orden")
    private java.util.List<CambioEmbarcacionSalida> cambiosEmbarcacion = new java.util.ArrayList<>();

    public void registrarCambioEmbarcacion(Long anterior, Long nueva, String motivo, java.time.LocalDateTime fechaHora) {
        cambiosEmbarcacion.add(new CambioEmbarcacionSalida(anterior, nueva, motivo, fechaHora));
    }
    private LocalDate fechaOriginal;
    private LocalTime horaOriginal;
    private LocalDate fechaAnterior;
    private LocalTime horaAnterior;
    private String motivoReprogramacion;
    private String motivoCancelacion;
    private java.time.LocalDateTime fechaCancelacion;

    public String getMotivoCancelacion() { return motivoCancelacion; }
    public void setMotivoCancelacion(String valor) { motivoCancelacion = valor; }
    public java.time.LocalDateTime getFechaCancelacion() { return fechaCancelacion; }
    public void setFechaCancelacion(java.time.LocalDateTime valor) { fechaCancelacion = valor; }

    public LocalDate getFechaOriginal() { return fechaOriginal; }
    public void setFechaOriginal(LocalDate valor) { fechaOriginal = valor; }
    public LocalTime getHoraOriginal() { return horaOriginal; }
    public void setHoraOriginal(LocalTime valor) { horaOriginal = valor; }
    public LocalDate getFechaAnterior() { return fechaAnterior; }
    public void setFechaAnterior(LocalDate valor) { fechaAnterior = valor; }
    public LocalTime getHoraAnterior() { return horaAnterior; }
    public void setHoraAnterior(LocalTime valor) { horaAnterior = valor; }
    public String getMotivoReprogramacion() { return motivoReprogramacion; }
    public void setMotivoReprogramacion(String valor) { motivoReprogramacion = valor; }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "La fecha de salida es obligatoria")
    // La fecha futura se valida al programar; el historial debe poder finalizarse después.
    @Column(nullable = false)
    private LocalDate fecha;

    @NotNull(message = "La hora de salida es obligatoria")
    @Column(name = "hora_salida", nullable = false)
    private LocalTime horaSalida;

    @Column(name = "inicio_real")
    private java.time.LocalDateTime inicioReal;

    @Column(name = "fin_real")
    private java.time.LocalDateTime finReal;

    public java.time.LocalDateTime getInicioReal() { return inicioReal; }
    public void setInicioReal(java.time.LocalDateTime valor) { inicioReal = valor; }
    public java.time.LocalDateTime getFinReal() { return finReal; }
    public void setFinReal(java.time.LocalDateTime valor) { finReal = valor; }

    @NotNull(message = "Los cupos disponibles son obligatorios")
    @PositiveOrZero(message = "Los cupos disponibles no pueden ser negativos")
    @Column(name = "cupos_disponibles", nullable = false)
    private Integer cuposDisponibles;

    @NotNull(message = "El estado de la salida es obligatorio")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoSalida estado;

    @NotNull(message = "El tour es obligatorio")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    @NotNull(message = "La embarcación es obligatoria")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "embarcacion_id", nullable = false)
    private Embarcacion embarcacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operador_id", nullable = true)
    private Usuario operador;

    public Usuario getOperador() { return operador; }
    public void setOperador(Usuario operador) { this.operador = operador; }

    public SalidaProgramada() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDate getFecha() {
        return fecha;
    }

    public void setFecha(LocalDate fecha) {
        this.fecha = fecha;
    }

    public LocalTime getHoraSalida() {
        return horaSalida;
    }

    public void setHoraSalida(LocalTime horaSalida) {
        this.horaSalida = horaSalida;
    }

    public Integer getCuposDisponibles() {
        return cuposDisponibles;
    }

    public void setCuposDisponibles(Integer cuposDisponibles) {
        this.cuposDisponibles = cuposDisponibles;
    }

    public EstadoSalida getEstado() {
        return estado;
    }

    public void setEstado(EstadoSalida estado) {
        this.estado = estado;
    }

    public Tour getTour() {
        return tour;
    }

    public void setTour(Tour tour) {
        this.tour = tour;
    }

    public Embarcacion getEmbarcacion() {
        return embarcacion;
    }

    public void setEmbarcacion(Embarcacion embarcacion) {
        this.embarcacion = embarcacion;
    }
}
