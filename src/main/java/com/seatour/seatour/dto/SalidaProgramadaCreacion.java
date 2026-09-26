package com.seatour.seatour.dto;

import com.seatour.seatour.model.EstadoSalida;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDate;
import java.time.LocalTime;

public class SalidaProgramadaCreacion {

    @NotNull(message = "La fecha de salida es obligatoria")
    @FutureOrPresent(message = "La fecha de salida no puede estar en el pasado")
    private LocalDate fecha;

    @NotNull(message = "La hora de salida es obligatoria")
    private LocalTime horaSalida;

    @NotNull(message = "Los cupos disponibles son obligatorios")
    @PositiveOrZero(message = "Los cupos disponibles no pueden ser negativos")
    private Integer cuposDisponibles;

    @NotNull(message = "El estado de la salida es obligatorio")
    private EstadoSalida estado;

    @NotNull(message = "El tour es obligatorio")
    private Long tourId;

    @NotNull(message = "La embarcación es obligatoria")
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