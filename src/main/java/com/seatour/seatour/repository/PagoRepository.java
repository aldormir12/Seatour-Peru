package com.seatour.seatour.repository;
import com.seatour.seatour.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PagoRepository extends JpaRepository<Pago, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"reserva", "reserva.salida", "reserva.salida.tour", "reserva.adicionales"})
    java.util.List<Pago> findByEstadoAndCreadoEnGreaterThanEqualAndCreadoEnLessThan(
            EstadoPago estado, java.time.Instant desde, java.time.Instant hasta);
    boolean existsByReservaIdAndEstado(Long reservaId, EstadoPago estado);
    long countByReservaIdAndEstado(Long reservaId, EstadoPago estado);
}
