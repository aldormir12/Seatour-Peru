package com.seatour.seatour.dto;

import com.seatour.seatour.model.ZonaMaritima;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MejorOpcionRespuesta(
        LocalDate fecha, String estado, ZonaMaritima mejorZona,
        Ventana mejorVentanaHoraria, TourSalida mejorTourSalida,
        Condiciones condicionesMaritimas, Disponibilidad disponibilidad, String insight,
        LocalDate fechaSalida, boolean esProximaRecomendacion) {
    // Conserva fecha como fecha consultada y el constructor del contrato existente.
    public MejorOpcionRespuesta(LocalDate fecha, String estado, ZonaMaritima mejorZona,
            Ventana mejorVentanaHoraria, TourSalida mejorTourSalida,
            Condiciones condicionesMaritimas, Disponibilidad disponibilidad, String insight) {
        this(fecha, estado, mejorZona, mejorVentanaHoraria, mejorTourSalida,
                condicionesMaritimas, disponibilidad, insight,
                mejorVentanaHoraria == null ? null : mejorVentanaHoraria.inicio().toLocalDate(),
                mejorVentanaHoraria != null && mejorVentanaHoraria.inicio().toLocalDate().isAfter(fecha));
    }
    public record Ventana(LocalDateTime inicio, LocalDateTime fin) {}
    public record TourSalida(Long tourId, String nombre, Long salidaId, int scoreAfinidad, String imagenUrl) {}
    public record Disponibilidad(boolean disponible, int cuposDisponibles) {}
    // Extremos durante la ventana: metros, km/h y metros, respectivamente.
    public record Condiciones(String estado, Double oleajeMaximoMetros,
            Double vientoMaximoKmh, Double visibilidadMinimaMetros) {}
}
