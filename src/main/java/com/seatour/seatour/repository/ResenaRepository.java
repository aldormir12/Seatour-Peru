package com.seatour.seatour.repository;

import com.seatour.seatour.model.Resena;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Collection;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResenaRepository extends JpaRepository<Resena, Long> {
    java.util.Optional<Resena> findByReserva_Id(Long reservaId);
    boolean existsByReserva_Id(Long reservaId);
    List<Resena> findByTour_IdOrderByCreadaEnDescIdDesc(Long tourId);
    interface ResumenTour {
        Long getTourId();
        Double getPromedio();
        long getCantidad();
    }

    @Query("select r.tour.id as tourId, avg(r.puntuacion) as promedio, count(r) as cantidad "
            + "from Resena r where r.tour.id in :tourIds group by r.tour.id")
    List<ResumenTour> resumirPorTours(@Param("tourIds") Collection<Long> tourIds);
}

