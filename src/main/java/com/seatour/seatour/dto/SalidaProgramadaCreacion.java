package com.seatour.seatour.dto;

import com.seatour.seatour.model.EstadoSalida;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public class SalidaProgramadaCreacion {
    private String motivoReprogramacion;
    public String getMotivoReprogramacion() { return motivoReprogramacion; }
    public void setMotivoReprogramacion(String valor) { motivoReprogramacion = valor; }
    public interface Edicion extends jakarta.validation.groups.Default {}

    @NotNull(message = "La fecha de salida es obligatoria")
    private LocalDate fecha;

    @NotNull(message = "La hora de salida es obligatoria")
    private LocalTime horaSalida;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private Integer cuposDisponibles;

    private EstadoSalida estado = EstadoSalida.PROGRAMADA;

    @NotNull(message = "El tour es obligatorio")
    @Positive(message = "El ID del tour debe ser positivo")
    private Long tourId;

    @NotNull(message = "La embarcación es obligatoria")
    @Positive(message = "El ID de la embarcación debe ser positivo")
    private Long embarcacionId;

    public SalidaProgramadaCreacion() {
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

    public Long getTourId() {
        return tourId;
    }

    public void setTourId(Long tourId) {
        this.tourId = tourId;
    }

    public Long getEmbarcacionId() {
        return embarcacionId;
    }

    public void setEmbarcacionId(Long embarcacionId) {
        this.embarcacionId = embarcacionId;
    }
}
