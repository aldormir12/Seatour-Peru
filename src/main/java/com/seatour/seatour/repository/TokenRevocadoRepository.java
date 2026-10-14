package com.seatour.seatour.repository;

import com.seatour.seatour.model.TokenRevocado;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;

public interface TokenRevocadoRepository extends JpaRepository<TokenRevocado, String> {
    @Modifying
    @Query(value = "INSERT INTO tokens_revocados (huella, expira_en) VALUES (:huella, :expira) ON CONFLICT DO NOTHING", nativeQuery = true)
    void revocar(@Param("huella") String huella, @Param("expira") Instant expira);

    @Modifying
    @Query("delete from TokenRevocado t where t.expiraEn <= :ahora")
    int limpiarVencidos(@Param("ahora") Instant ahora);
}
