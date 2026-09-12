package com.seatour.seatour.repository;

import com.seatour.seatour.model.Tour;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TourRepository extends JpaRepository<Tour, Long> {
}