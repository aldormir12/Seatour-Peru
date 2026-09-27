package com.seatour.seatour.repository;

import com.seatour.seatour.model.Tour;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TourRepository extends JpaRepository<Tour, Long> {
    boolean existsByCategoriaTour_Id(Long categoriaId);
    java.util.List<Tour> findByActivoTrueOrderByNombreAsc();
    java.util.List<Tour> findAllByOrderByNombreAsc();
    boolean existsByNombreIgnoreCase(String nombre);
    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);
}
