package com.seatour.seatour.service;

import com.seatour.seatour.model.Tour;
import com.seatour.seatour.repository.TourRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TourService {

    private final TourRepository tourRepository;

    public TourService(TourRepository tourRepository) {
        this.tourRepository = tourRepository;
    }

    public List<Tour> listarTodos() {
        return tourRepository.findAll();
    }

    public Optional<Tour> buscarPorId(Long id) {
        return tourRepository.findById(id);
    }

    public Tour guardar(Tour tour) {

        if (tour.getNombre() == null || tour.getNombre().isBlank()) {
            throw new IllegalArgumentException("El nombre del tour es obligatorio");
        }

        return tourRepository.save(tour);
    }

    public void eliminar(Long id) {
        tourRepository.deleteById(id);
    }
}