package com.seatour.seatour.repository;

import com.seatour.seatour.model.ModificacionReserva;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ModificacionReservaRepository extends JpaRepository<ModificacionReserva, Long> {
    List<ModificacionReserva> findByReservaIdOrderByIdAsc(Long reservaId);
}
