package com.seatour.seatour.repository;

import com.seatour.seatour.model.EstadoSalida;
import com.seatour.seatour.model.SalidaProgramada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SalidaProgramadaRepository extends JpaRepository<SalidaProgramada, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour", "embarcacion", "operador"})
    List<SalidaProgramada> findByEstadoOrderByInicioRealDescIdDesc(EstadoSalida estado);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour"})
    List<SalidaProgramada> findByFechaBetweenOrderByFechaAscHoraSalidaAsc(LocalDate desde, LocalDate hasta);
    @Query("""
            select count(s) from SalidaProgramada s
            where s.operador.id = :operadorId
              and s.estado <> com.seatour.seatour.model.EstadoSalida.CANCELADA
              and (s.fecha > :fecha or (s.fecha = :fecha and s.horaSalida > :hora))
            """)
    long contarSalidasFuturasDelOperador(@Param("operadorId") Long operadorId,
            @Param("fecha") LocalDate fecha, @Param("hora") java.time.LocalTime hora);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour", "embarcacion", "operador"})
    List<SalidaProgramada> findByOperador_IdOrderByFechaAscHoraSalidaAsc(Long operadorId);

    @Query("""
            select s.id from SalidaProgramada s
            where s.estado = com.seatour.seatour.model.EstadoSalida.PROGRAMADA
              and (s.fecha < :fecha or (s.fecha = :fecha and s.horaSalida <= :hora))
            order by s.fecha, s.horaSalida, s.id
            """)
    List<Long> buscarPendientesDeInicio(@Param("fecha") LocalDate fecha,
            @Param("hora") java.time.LocalTime hora);

    boolean existsByTour_Id(Long tourId);
    boolean existsByEmbarcacion_Id(Long embarcacionId);

    // Una sola consulta observa cupos y reservas de forma consistente. Reservar/cancelar
    // conserva su suma; asignar embarcaciones se serializa con el bloqueo de la embarcacion.
    @Query("""
            select count(s) from SalidaProgramada s
            where s.embarcacion.id = :embarcacionId
              and (s.fecha > :fecha or (s.fecha = :fecha and s.horaSalida > :hora)
                   or s.estado in (com.seatour.seatour.model.EstadoSalida.PROGRAMADA,
                                   com.seatour.seatour.model.EstadoSalida.EN_CURSO))
              and s.cuposDisponibles +
                  (select coalesce(sum(r.pasajeros), 0) from Reserva r
                   where r.salida = s and r.estado <> :cancelada) > :capacidad
            """)
    long contarSalidasQueExcedenCapacidad(
            @Param("embarcacionId") Long embarcacionId,
            @Param("fecha") LocalDate fecha,
            @Param("hora") java.time.LocalTime hora,
            @Param("cancelada") com.seatour.seatour.model.EstadoReserva cancelada,
            @Param("capacidad") Integer capacidad);

    @Override
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour", "embarcacion", "operador"})
    List<SalidaProgramada> findAll();

    @Override
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour", "embarcacion", "operador"})
    java.util.Optional<SalidaProgramada> findById(Long id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SalidaProgramada s left join fetch s.operador where s.id = :id")
    java.util.Optional<SalidaProgramada> bloquearPorId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour", "embarcacion", "operador"})
    @Query("""
            SELECT s
            FROM SalidaProgramada s
            WHERE s.tour.id = :tourId
              AND s.estado = :estado
              AND s.cuposDisponibles > 0
              AND s.tour.activo = true
              AND (s.embarcacion.activo = true OR
                   (s.embarcacion.activo IS NULL AND upper(s.embarcacion.estado) = 'ACTIVA'))
              AND (s.fecha > :fecha OR (s.fecha = :fecha AND s.horaSalida > :hora))
            ORDER BY s.fecha ASC, s.horaSalida ASC
            """)
    List<SalidaProgramada> buscarSalidasDisponiblesPorTour(
            @Param("tourId") Long tourId,
            @Param("estado") EstadoSalida estado,
            @Param("fecha") LocalDate fecha,
            @Param("hora") java.time.LocalTime hora);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour", "embarcacion", "operador"})
    List<SalidaProgramada> findByTourIdOrderByFechaAscHoraSalidaAsc(Long tourId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"tour"})
    List<SalidaProgramada> findByEmbarcacionIdOrderByFechaAscHoraSalidaAsc(Long embarcacionId);
}
