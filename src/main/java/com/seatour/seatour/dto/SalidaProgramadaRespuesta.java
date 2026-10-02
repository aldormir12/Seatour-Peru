package com.seatour.seatour.dto;

import com.seatour.seatour.model.EstadoSalida;

import java.time.LocalDate;
import java.time.LocalTime;

public class SalidaProgramadaRespuesta {
    private boolean esDemo = false;
    public boolean isEsDemo() { return esDemo; }
    public void setEsDemo(boolean valor) { esDemo = valor; }

    private boolean tieneReservas;
    private boolean cambioOperativoConsumido;
    public boolean isCambioOperativoConsumido() { return cambioOperativoConsumido; }
    public void setCambioOperativoConsumido(boolean valor) { cambioOperativoConsumido = valor; }
    private long pasajerosReservados;
    public long getPasajerosReservados() { return pasajerosReservados; }
    public void setPasajerosReservados(long valor) { pasajerosReservados = valor; }
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
    public boolean isTieneReservas() { return tieneReservas; }
    public void setTieneReservas(boolean valor) { tieneReservas = valor; }
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

    private Long id;
    private LocalDate fecha;
    private LocalTime horaSalida;
    private java.time.LocalDateTime inicioReal;
    private java.time.LocalDateTime finReal;

    public java.time.LocalDateTime getInicioReal() { return inicioReal; }
    public void setInicioReal(java.time.LocalDateTime valor) { inicioReal = valor; }
    public java.time.LocalDateTime getFinReal() { return finReal; }
    public void setFinReal(java.time.LocalDateTime valor) { finReal = valor; }
    private Integer cuposDisponibles;
    private EstadoSalida estado;

    private Long tourId;
    private String tourNombre;
    private Integer duracionMinutos;

    public Integer getDuracionMinutos() { return duracionMinutos; }
    public void setDuracionMinutos(Integer valor) { duracionMinutos = valor; }

    private Long embarcacionId;
    private String embarcacionNombre;
    private Long operadorId;
    private String operadorNombre;
    private String operadorApellido;

    public Long getOperadorId() { return operadorId; }
    public void setOperadorId(Long operadorId) { this.operadorId = operadorId; }
    public String getOperadorNombre() { return operadorNombre; }
    public void setOperadorNombre(String operadorNombre) { this.operadorNombre = operadorNombre; }
    public String getOperadorApellido() { return operadorApellido; }
    public void setOperadorApellido(String operadorApellido) { this.operadorApellido = operadorApellido; }
    private java.math.BigDecimal precioPorPasajero;
    private boolean reservable;

    public java.math.BigDecimal getPrecioPorPasajero() { return precioPorPasajero; }
    public void setPrecioPorPasajero(java.math.BigDecimal precio) { this.precioPorPasajero = precio; }
    public boolean isReservable() { return reservable; }
    public void setReservable(boolean reservable) { this.reservable = reservable; }

    public SalidaProgramadaRespuesta() {
    }

    public SalidaProgramadaRespuesta(
            Long id,
            LocalDate fecha,
            LocalTime horaSalida,
            Integer cuposDisponibles,
            EstadoSalida estado,
            Long tourId,
            String tourNombre,
            Long embarcacionId,
            String embarcacionNombre) {
        this.id = id;
        this.fecha = fecha;
        this.horaSalida = horaSalida;
        this.cuposDisponibles = cuposDisponibles;
        this.estado = estado;
        this.tourId = tourId;
        this.tourNombre = tourNombre;
        this.embarcacionId = embarcacionId;
        this.embarcacionNombre = embarcacionNombre;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getFecha() {
        return fecha;
    }

    public LocalTime getHoraSalida() {
        return horaSalida;
    }

    public Integer getCuposDisponibles() {
        return cuposDisponibles;
    }

    public EstadoSalida getEstado() {
        return estado;
    }

    public Long getTourId() {
        return tourId;
    }

    public String getTourNombre() {
        return tourNombre;
    }

    public Long getEmbarcacionId() {
        return embarcacionId;
    }

    public String getEmbarcacionNombre() {
        return embarcacionNombre;
    }
}
