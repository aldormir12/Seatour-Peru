package com.seatour.seatour.repository;
import com.seatour.seatour.model.Adicional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface AdicionalRepository extends JpaRepository<Adicional, Long> {
    Optional<Adicional> findByNombre(String nombre);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Adicional a where a.nombre = :nombre")
    Optional<Adicional> buscarBaseParaAsociar(@Param("nombre") String nombre);
    List<Adicional> findAllByOrderByNombreAsc();
    @Query("select a from Adicional a join a.tours t where t.id = :tourId and a.activo = true and t.activo = true and a.precio is not null and a.tipoCobro is not null order by a.nombre")
    List<Adicional> disponibles(@Param("tourId") Long tourId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Adicional a where a.id = :id")
    Optional<Adicional> bloquear(@Param("id") Long id);
}
