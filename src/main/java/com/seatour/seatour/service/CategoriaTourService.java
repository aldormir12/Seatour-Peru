package com.seatour.seatour.service;

import com.seatour.seatour.model.CategoriaTour;
import com.seatour.seatour.repository.CategoriaTourRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoriaTourService {

    private final CategoriaTourRepository categoriaTourRepository;

    public CategoriaTourService(CategoriaTourRepository categoriaTourRepository) {
        this.categoriaTourRepository = categoriaTourRepository;
    }

    public List<CategoriaTour> listarTodos() {
        return categoriaTourRepository.findAll();
    }

    public CategoriaTour guardar(CategoriaTour categoriaTour) {
        if (categoriaTour.getNombre() == null || categoriaTour.getNombre().isBlank()) {
            throw new IllegalArgumentException("El nombre de la categoría es obligatorio");
        }

        return categoriaTourRepository.save(categoriaTour);
    }
}