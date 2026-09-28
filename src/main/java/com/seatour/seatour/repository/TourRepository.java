package com.seatour.seatour.repository;

import com.seatour.seatour.model.Tour;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TourRepository extends JpaRepository<Tour, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select t from Tour t where t.id = :id")
    java.util.Optional<Tour> bloquearPorId(@org.springframework.data.repository.query.Param("id") Long id);
    boolean existsByCategoriaTour_Id(Long categoriaId);
    java.util.List<Tour> findByActivoTrueOrderByNombreAsc();
    java.util.List<Tour> findAllByOrderByNombreAsc();
    boolean existsByNombreIgnoreCase(String nombre);
    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);
}
