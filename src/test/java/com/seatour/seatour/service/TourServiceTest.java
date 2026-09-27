package com.seatour.seatour.service;

import com.seatour.seatour.dto.TourCreacion;
import com.seatour.seatour.model.CategoriaTour;
import com.seatour.seatour.model.Tour;
import com.seatour.seatour.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TourServiceTest {
    @Mock TourRepository tours;
    @Mock CategoriaTourRepository categorias;
    @Mock SalidaProgramadaRepository salidas;
    private TourService servicio;

    @BeforeEach
    void preparar() {
        servicio = new TourService(tours, categorias, salidas);
    }

    @Test
    void creaTourNormalizadoConCategoriaActiva() {
        CategoriaTour categoria = new CategoriaTour();
        categoria.setId(1L);
        categoria.setActivo(true);
        when(categorias.findById(1L)).thenReturn(Optional.of(categoria));
        when(tours.saveAndFlush(any(Tour.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
        var resultado = servicio.crear(new TourCreacion("  avistamiento   de ballenas ", " Paseo ",
                60, BigDecimal.TEN, true, 1L, "/api/tours/imagenes/fixture.jpg"));
        assertEquals("Avistamiento de ballenas", resultado.nombre());
        assertEquals(1L, resultado.categoriaId());
    }

    @Test
    void rechazaEliminarTourConSalidas() {
        when(tours.findById(1L)).thenReturn(Optional.of(new Tour()));
        when(salidas.existsByTour_Id(1L)).thenReturn(true);
        var error = assertThrows(ResponseStatusException.class, () -> servicio.eliminar(1L));
        assertEquals(409, error.getStatusCode().value());
        verify(tours, never()).delete(any());
    }
}
