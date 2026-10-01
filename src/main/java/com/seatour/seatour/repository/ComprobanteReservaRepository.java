package com.seatour.seatour.repository;

import com.seatour.seatour.model.ComprobanteReserva;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;

public interface ComprobanteReservaRepository extends JpaRepository<ComprobanteReserva, Long> {
    boolean existsByReservaId(Long reservaId);
    Optional<ComprobanteReserva> findByCodigo(String codigo);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ComprobanteReserva c where c.enviadoEn is null and c.omitidoEn is null and c.proximoIntento <= :ahora order by c.id")
    List<ComprobanteReserva> pendientes(@Param("ahora") Instant ahora, Pageable pagina);
}
