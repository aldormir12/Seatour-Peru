package com.seatour.seatour.repository;

import com.seatour.seatour.model.Embarcacion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmbarcacionRepository extends JpaRepository<Embarcacion, Long> {
}