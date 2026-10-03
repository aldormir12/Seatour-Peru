package com.seatour.seatour.repository;

import com.seatour.seatour.model.Notificacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.Optional;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {
    Page<Notificacion> findByUsuario_IdOrderByCreadaEnDescIdDesc(Long usuarioId, Pageable pagina);
    long countByUsuario_IdAndLeidaEnIsNull(Long usuarioId);
    Optional<Notificacion> findByIdAndUsuario_Id(Long id, Long usuarioId);
    Optional<Notificacion> findByUsuario_IdAndClaveDeduplicacion(Long usuarioId, String claveDeduplicacion);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Notificacion n set n.leidaEn = :ahora "
            + "where n.id = :id and n.usuario.id = :usuarioId and n.leidaEn is null")
    int marcarLeida(@Param("id") Long id, @Param("usuarioId") Long usuarioId, @Param("ahora") Instant ahora);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Notificacion n set n.leidaEn = :ahora "
            + "where n.usuario.id = :usuarioId and n.leidaEn is null")
    int marcarTodasLeidas(@Param("usuarioId") Long usuarioId, @Param("ahora") Instant ahora);
}
