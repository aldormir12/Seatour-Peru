package com.seatour.seatour.config;

import com.seatour.seatour.repository.TourRepository;
import com.seatour.seatour.service.AdicionalesBaseService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdicionalesIniciales implements CommandLineRunner {
    private final AdicionalesBaseService adicionalesBase;
    private final TourRepository tours;

    public AdicionalesIniciales(AdicionalesBaseService adicionalesBase, TourRepository tours) {
        this.adicionalesBase = adicionalesBase;
        this.tours = tours;
    }

    @Override
    @Transactional
    public void run(String... args) {
        adicionalesBase.garantizarPara(tours.findAll());
    }
}
