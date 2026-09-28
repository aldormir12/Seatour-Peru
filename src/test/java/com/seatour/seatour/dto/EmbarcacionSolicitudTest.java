package com.seatour.seatour.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class EmbarcacionSolicitudTest {
    private static final ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();
    private static final Validator VALIDATOR = FACTORY.getValidator();

    @AfterAll
    static void cerrar() { FACTORY.close(); }

    private EmbarcacionSolicitud solicitud(String tipo, int capacidad) {
        return new EmbarcacionSolicitud("SeaTour", "MAT-01", tipo, capacidad, true,
                "/api/embarcaciones/imagenes/imagen.jpg");
    }

    @ParameterizedTest
    @ValueSource(strings = {"LANCHA", "LANCHA_RAPIDA", "YATE", "CATAMARAN", "BOTE_PESCA", "EMBARCACION_TURISTICA"})
    void aceptaTiposPermitidos(String tipo) {
        assertTrue(VALIDATOR.validate(solicitud(tipo, 10)).isEmpty());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "Lancha", "LANCHA RAPIDA", "SUBMARINO", "YATE|LANCHA"})
    void rechazaTiposNoPermitidos(String tipo) {
        assertTrue(VALIDATOR.validate(solicitud(tipo, 10)).stream()
                .anyMatch(error -> error.getPropertyPath().toString().equals("tipo")));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 100})
    void conservaLimitesDeCapacidad(int capacidad) {
        assertTrue(VALIDATOR.validate(solicitud("LANCHA", capacidad)).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 101})
    void rechazaCapacidadFueraDeRango(int capacidad) {
        assertTrue(VALIDATOR.validate(solicitud("LANCHA", capacidad)).stream()
                .anyMatch(error -> error.getPropertyPath().toString().equals("capacidad")));
    }
}
