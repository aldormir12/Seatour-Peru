package com.seatour.seatour.controller;

import com.seatour.seatour.dto.SalidaProgramadaCreacion;
import com.seatour.seatour.dto.SalidaProgramadaRespuesta;
import com.seatour.seatour.model.Embarcacion;
import com.seatour.seatour.model.SalidaProgramada;
import com.seatour.seatour.model.Tour;
import com.seatour.seatour.service.SalidaProgramadaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/salidas")
public class SalidaProgramadaController {

    private final SalidaProgramadaService salidaProgramadaService;

    public SalidaProgramadaController(
            SalidaProgramadaService salidaProgramadaService) {
        this.salidaProgramadaService = salidaProgramadaService;
    }

    @GetMapping
    public ResponseEntity<List<SalidaProgramadaRespuesta>> listarTodas() {

        List<SalidaProgramadaRespuesta> respuesta = salidaProgramadaService.listarTodas()
                .stream()
                .map(this::convertirARespuesta)
                .toList();

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SalidaProgramadaRespuesta> buscarPorId(
            @PathVariable Long id) {
        SalidaProgramada salida = salidaProgramadaService.buscarPorId(id);

        return ResponseEntity.ok(
                convertirARespuesta(salida));
    }

    @GetMapping("/tour/{tourId}")
    public ResponseEntity<List<SalidaProgramadaRespuesta>> listarPorTour(
            @PathVariable Long tourId) {

        List<SalidaProgramadaRespuesta> respuesta = salidaProgramadaService.listarPorTour(tourId)
                .stream()
                .map(this::convertirARespuesta)
                .toList();

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/tour/{tourId}/disponibles")
    public ResponseEntity<List<SalidaProgramadaRespuesta>> listarDisponiblesPorTour(
            @PathVariable Long tourId) {

        List<SalidaProgramadaRespuesta> respuesta = salidaProgramadaService
                .listarDisponiblesPorTour(tourId)
                .stream()
                .map(this::convertirARespuesta)
                .toList();

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping
    public ResponseEntity<SalidaProgramadaRespuesta> crear(
            @Valid @RequestBody SalidaProgramadaCreacion datos) {

        SalidaProgramada salida = convertirAEntidad(datos);

        SalidaProgramada creada = salidaProgramadaService.crear(salida);

        URI ubicacion = URI.create(
                "/api/salidas/" + creada.getId());

        return ResponseEntity
                .created(ubicacion)
                .body(convertirARespuesta(creada));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SalidaProgramadaRespuesta> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody SalidaProgramadaCreacion datos) {

        SalidaProgramada salida = convertirAEntidad(datos);

        SalidaProgramada actualizada = salidaProgramadaService.actualizar(
                id,
                salida);

        return ResponseEntity.ok(
                convertirARespuesta(actualizada));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @PathVariable Long id) {

        salidaProgramadaService.eliminar(id);

        return ResponseEntity.noContent().build();
    }

    private SalidaProgramada convertirAEntidad(
            SalidaProgramadaCreacion datos) {

        SalidaProgramada salida = new SalidaProgramada();

        salida.setFecha(datos.getFecha());
        salida.setHoraSalida(datos.getHoraSalida());
        salida.setCuposDisponibles(
                datos.getCuposDisponibles());
        salida.setEstado(datos.getEstado());

        Tour tour = new Tour();
        tour.setId(datos.getTourId());
        salida.setTour(tour);

        Embarcacion embarcacion = new Embarcacion();

        embarcacion.setId(
                datos.getEmbarcacionId());

        salida.setEmbarcacion(embarcacion);

        return salida;
    }

    private SalidaProgramadaRespuesta convertirARespuesta(
            SalidaProgramada salida) {

        return new SalidaProgramadaRespuesta(
                salida.getId(),
                salida.getFecha(),
                salida.getHoraSalida(),
                salida.getCuposDisponibles(),
                salida.getEstado(),
                salida.getTour().getId(),
                salida.getTour().getNombre(),
                salida.getEmbarcacion().getId(),
                salida.getEmbarcacion().getNombre());
    }
}