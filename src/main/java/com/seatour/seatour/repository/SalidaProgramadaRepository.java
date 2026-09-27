package com.seatour.seatour.repository;

import com.seatour.seatour.model.EstadoSalida;
import com.seatour.seatour.model.SalidaProgramada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SalidaProgramadaRepository extends JpaRepository<SalidaProgramada, Long> {
    boolean existsByTour_Id(Long tourId);

    @Override
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour", "embarcacion"})
    List<SalidaProgramada> findAll();

    @Override
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour", "embarcacion"})
    java.util.Optional<SalidaProgramada> findById(Long id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SalidaProgramada s where s.id = :id")
    java.util.Optional<SalidaProgramada> bloquearPorId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour", "embarcacion"})
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

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour", "embarcacion"})
    List<SalidaProgramada> findByTourIdOrderByFechaAscHoraSalidaAsc(Long tourId);

    List<SalidaProgramada> findByEmbarcacionIdOrderByFechaAscHoraSalidaAsc(Long embarcacionId);
}
