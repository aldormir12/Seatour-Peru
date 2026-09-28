package com.seatour.seatour.repository;

import com.seatour.seatour.model.Embarcacion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmbarcacionRepository extends JpaRepository<Embarcacion, Long> {
    java.util.List<Embarcacion> findAllByOrderByNombreAscIdAsc();
    boolean existsByMatriculaIgnoreCase(String matricula);
    boolean existsByMatriculaIgnoreCaseAndIdNot(String matricula, Long id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from Embarcacion e where e.id = :id")
    java.util.Optional<Embarcacion> bloquearPorId(@org.springframework.data.repository.query.Param("id") Long id);
}
