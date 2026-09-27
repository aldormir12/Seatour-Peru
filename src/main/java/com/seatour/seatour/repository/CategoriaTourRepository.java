package com.seatour.seatour.repository;

import com.seatour.seatour.model.CategoriaTour;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoriaTourRepository extends JpaRepository<CategoriaTour, Long> {
    java.util.List<CategoriaTour> findByActivoTrueOrderByNombreAsc();
    java.util.List<CategoriaTour> findAllByOrderByNombreAsc();
    boolean existsByNombreIgnoreCase(String nombre);
    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);
}
