package com.seatour.seatour.repository;

import com.seatour.seatour.model.IntentoLogin;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;

public interface IntentoLoginRepository extends JpaRepository<IntentoLogin, String> {
    // La PK y ON CONFLICT resuelven también dos primeros intentos simultáneos.
    @Modifying
    @Query(value = "INSERT INTO intentos_login (clave, fallos, ventana_desde) VALUES (:clave, 0, :ahora) ON CONFLICT DO NOTHING", nativeQuery = true)
    void asegurar(@Param("clave") String clave, @Param("ahora") Instant ahora);

    // No eliminar contadores consecutivos de cuentas existentes ni bloqueos vigentes.
    // Se bloquean lotes pequeños sin esperar a peticiones de login en curso.
    @Modifying
    @Query(value = """
            WITH cuentas AS MATERIALIZED (
                SELECT 'cuenta:' || encode(sha256(convert_to(lower(btrim(correo)), 'UTF8')), 'hex') AS clave
                FROM usuarios
            ), antiguas AS (
                SELECT i.clave FROM intentos_login i
                WHERE coalesce(i.ultimo_intento, i.ventana_desde) < :antes
                  AND (i.bloqueado_hasta IS NULL OR i.bloqueado_hasta <= :ahora)
                  AND (i.clave LIKE 'ip:%' OR i.fallos = 0 OR i.bloqueado_hasta IS NOT NULL
                       OR NOT EXISTS (SELECT 1 FROM cuentas c WHERE c.clave = i.clave))
                ORDER BY i.ultimo_intento NULLS FIRST, i.clave
                LIMIT 1000 FOR UPDATE OF i SKIP LOCKED
            )
            DELETE FROM intentos_login i USING antiguas a WHERE i.clave = a.clave
            """, nativeQuery = true)
    int limpiarAntiguos(@Param("antes") Instant antes, @Param("ahora") Instant ahora);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from IntentoLogin i where i.clave = :clave")
    IntentoLogin bloquear(@Param("clave") String clave);
}
