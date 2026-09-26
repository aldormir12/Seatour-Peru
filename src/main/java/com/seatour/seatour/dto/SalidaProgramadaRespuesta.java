package com.seatour.seatour.dto;

import com.seatour.seatour.model.EstadoSalida;

import java.time.LocalDate;
import java.time.LocalTime;

public class SalidaProgramadaRespuesta {

    private Long id;
    private LocalDate fecha;
    private LocalTime horaSalida;
    private Integer cuposDisponibles;
    private EstadoSalida estado;

    private Long tourId;
    private String tourNombre;

    private Long embarcacionId;
    private String embarcacionNombre;
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
