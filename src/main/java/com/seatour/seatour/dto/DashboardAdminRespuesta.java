package com.seatour.seatour.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DashboardAdminRespuesta(
        LocalDate desde, LocalDate hasta, String zonaHoraria, String moneda,
        BigDecimal ingresosRegistrados, long pagosAprobados,
        Double ocupacionPromedioPorcentaje, long salidasConOcupacion, long salidasSinOcupacionCalculable,
        Desviacion puntualidadInicio, Desviacion puntualidadCierre,
        List<DemandaTour> demandaPorTour, List<IngresoTour> ingresosPorTour,
        List<DemandaTour> toursMayorDemanda, List<AdicionalVendido> adicionalesMasVendidos,
        List<String> criterios) {

    public record Desviacion(long salidasEvaluables, long salidasSinDatosEvaluables,
            Double desviacionMediaMinutos, Double errorAbsolutoMedioMinutos) {}
    public record DemandaTour(Long tourId, String tourNombre, long reservas, long pasajeros) {}
    public record IngresoTour(Long tourId, String tourNombre, BigDecimal ingresosRegistrados) {}
    public record AdicionalVendido(Long adicionalId, String nombre, String tipoCobro,
            long cantidad, BigDecimal importeRegistrado) {}
}
