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

    @Query("select r.salida.id from Reserva r where r.id = :id")
    Optional<Long> buscarSalidaId(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Reserva r where r.id = :id")
    Optional<Reserva> bloquearPorId(@Param("id") Long id);
}
