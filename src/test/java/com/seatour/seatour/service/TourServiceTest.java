package com.seatour.seatour.service;

import com.seatour.seatour.model.Tour;
import com.seatour.seatour.repository.TourRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TourServiceTest {

    @Mock
    private TourRepository tourRepository;

    private TourService tourService;

    @BeforeEach
    void setUp() {
        tourService = new TourService(tourRepository);
    }

    @Test
    void debeGuardarTourCuandoNombreEsValido() {
        Tour tour = new Tour();
        tour.setNombre("Avistamiento de ballenas");

        when(tourRepository.save(tour)).thenReturn(tour);

        Tour resultado = tourService.guardar(tour);

        assertNotNull(resultado);
        assertEquals("Avistamiento de ballenas", resultado.getNombre());

        verify(tourRepository).save(tour);
    }

    @Test
    void noDebeGuardarTourCuandoNombreEstaVacio() {
        Tour tour = new Tour();
        tour.setNombre("");

        IllegalArgumentException excepcion = assertThrows(
                IllegalArgumentException.class,
                () -> tourService.guardar(tour));

        assertEquals(
                "El nombre del tour es obligatorio",
                excepcion.getMessage());

        verify(tourRepository, never()).save(any(Tour.class));
    }
}