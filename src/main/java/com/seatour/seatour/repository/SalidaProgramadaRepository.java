package com.seatour.seatour.repository;

import com.seatour.seatour.model.EstadoSalida;
import com.seatour.seatour.model.SalidaProgramada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SalidaProgramadaRepository extends JpaRepository<SalidaProgramada, Long> {

    @Query("""
            SELECT s
            FROM SalidaProgramada s
            WHERE s.tour.id = :tourId
              AND s.estado = :estado
              AND s.cuposDisponibles > 0
              AND s.fecha >= :fecha
            ORDER BY s.fecha ASC, s.horaSalida ASC
            """)
    List<SalidaProgramada> buscarSalidasDisponiblesPorTour(
            @Param("tourId") Long tourId,
            @Param("estado") EstadoSalida estado,
            @Param("fecha") LocalDate fecha);

    List<SalidaProgramada> findByTourIdOrderByFechaAscHoraSalidaAsc(Long tourId);

    List<SalidaProgramada> findByEmbarcacionIdOrderByFechaAscHoraSalidaAsc(Long embarcacionId);
}