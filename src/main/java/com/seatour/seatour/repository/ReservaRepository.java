package com.seatour.seatour.repository;

import com.seatour.seatour.model.Reserva;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {
    List<Reserva> findByClienteIdOrderByCreadaEnDescIdDesc(Long clienteId);
    List<Reserva> findAllByOrderByCreadaEnDescIdDesc();
    boolean existsBySalidaId(Long salidaId);
    List<Reserva> findBySalidaIdOrderByIdAsc(Long salidaId);

    @Query("select coalesce(sum(r.pasajeros), 0) from Reserva r where r.salida.id = :salidaId and r.estado <> :cancelada")
    long pasajerosActivos(@Param("salidaId") Long salidaId,
            @Param("cancelada") com.seatour.seatour.model.EstadoReserva cancelada);

    @Query("select r.salida.id from Reserva r where r.id = :id")
    Optional<Long> buscarSalidaId(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Reserva r where r.id = :id")
    Optional<Reserva> bloquearPorId(@Param("id") Long id);
}
