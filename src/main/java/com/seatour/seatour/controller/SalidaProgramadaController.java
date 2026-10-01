package com.seatour.seatour.controller;

import com.seatour.seatour.dto.SalidaProgramadaCreacion;
import com.seatour.seatour.dto.SalidaProgramadaRespuesta;
import com.seatour.seatour.model.Embarcacion;
import com.seatour.seatour.model.SalidaProgramada;
import com.seatour.seatour.model.Tour;
import com.seatour.seatour.model.Usuario;
import com.seatour.seatour.service.SalidaProgramadaService;
import com.seatour.seatour.service.ReservaService;
import com.seatour.seatour.security.UsuarioPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/salidas")
public class SalidaProgramadaController {

    private final SalidaProgramadaService salidaProgramadaService;
    private final ReservaService reservas;

    public SalidaProgramadaController(
            SalidaProgramadaService salidaProgramadaService, ReservaService reservas) {
        this.salidaProgramadaService = salidaProgramadaService;
        this.reservas = reservas;
    }

    @GetMapping("/mis-salidas")
    public List<SalidaProgramadaRespuesta> listarPropias(@AuthenticationPrincipal UsuarioPrincipal actor) {
        return salidaProgramadaService.listarPropias(actor.datos()).stream()
                .map(this::convertirARespuesta).toList();
    }

    @GetMapping("/mis-salidas/{id}")
    public SalidaProgramadaRespuesta detallePropio(@PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        return convertirARespuesta(salidaProgramadaService.buscarPropia(id, actor.datos()));
    }

    @GetMapping("/mis-salidas/{id}/reservas")
    public List<com.seatour.seatour.dto.ReservaRespuesta> reservasPropias(@PathVariable Long id,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        return reservas.listarPorSalidaPropia(id, actor.datos());
    }

    @GetMapping
    public ResponseEntity<List<SalidaProgramadaRespuesta>> listarTodas(@AuthenticationPrincipal UsuarioPrincipal actor) {

        List<SalidaProgramadaRespuesta> respuesta = (esOperador(actor)
                ? salidaProgramadaService.listarPropias(actor.datos()) : salidaProgramadaService.listarTodas())
                .stream()
                .map(this::convertirARespuesta)
                .toList();

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SalidaProgramadaRespuesta> buscarPorId(
            @PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal actor) {
        SalidaProgramada salida = esOperador(actor)
                ? salidaProgramadaService.buscarPropia(id, actor.datos()) : salidaProgramadaService.buscarPorId(id);

        return ResponseEntity.ok(
                convertirARespuesta(salida));
    }

    @GetMapping("/tour/{tourId}")
    public ResponseEntity<List<SalidaProgramadaRespuesta>> listarPorTour(
            @PathVariable Long tourId, @AuthenticationPrincipal UsuarioPrincipal actor) {

        List<SalidaProgramadaRespuesta> respuesta = salidaProgramadaService.listarPorTour(tourId)
                .stream()
                .filter(s -> visiblePara(s, actor))
                .map(this::convertirARespuesta)
                .toList();

        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/tour/{tourId}/disponibles")
    public ResponseEntity<List<SalidaProgramadaRespuesta>> listarDisponiblesPorTour(
            @PathVariable Long tourId, @AuthenticationPrincipal UsuarioPrincipal actor) {

        List<SalidaProgramadaRespuesta> respuesta = salidaProgramadaService
                .listarDisponiblesPorTour(tourId)
                .stream()
                .filter(s -> visiblePara(s, actor))
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
            @org.springframework.validation.annotation.Validated(SalidaProgramadaCreacion.Edicion.class)
            @RequestBody SalidaProgramadaCreacion datos) {

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

    @PatchMapping("/{id}/estado")
    public ResponseEntity<SalidaProgramadaRespuesta> cambiarEstado(@PathVariable Long id,
            @Valid @RequestBody com.seatour.seatour.dto.SalidaProgramadaEstado datos,
            @AuthenticationPrincipal UsuarioPrincipal actor) {
        return ResponseEntity.ok(convertirARespuesta(salidaProgramadaService.cambiarEstadoAutorizado(
                id, datos.estado(), datos.motivoCancelacion(), actor.datos())));
    }

    @PatchMapping("/{id}/embarcacion")
    public ResponseEntity<SalidaProgramadaRespuesta> cambiarEmbarcacion(@PathVariable Long id,
            @Valid @RequestBody com.seatour.seatour.dto.SalidaCambioEmbarcacion datos) {
        return ResponseEntity.ok(convertirARespuesta(salidaProgramadaService.cambiarEmbarcacion(
                id, datos.embarcacionId(), datos.motivo())));
    }

    @GetMapping("/embarcaciones/activas")
    public java.util.List<com.seatour.seatour.dto.EmbarcacionRespuesta> embarcacionesActivas() {
        return salidaProgramadaService.listarEmbarcacionesActivas();
    }

    private boolean esOperador(UsuarioPrincipal actor) {
        return actor != null && "OPERADOR".equals(actor.datos().rol());
    }

    private boolean visiblePara(SalidaProgramada salida, UsuarioPrincipal actor) {
        return !esOperador(actor) || salida.getOperador() != null
                && salida.getOperador().getId().equals(actor.datos().id());
    }

    private SalidaProgramada convertirAEntidad(
            SalidaProgramadaCreacion datos) {

        SalidaProgramada salida = new SalidaProgramada();

        salida.setFecha(datos.getFecha());
        salida.setHoraSalida(datos.getHoraSalida());
        salida.setCuposDisponibles(
                datos.getCuposDisponibles());
        salida.setEstado(datos.getEstado());
        salida.setMotivoReprogramacion(datos.getMotivoReprogramacion());

        Tour tour = new Tour();
        tour.setId(datos.getTourId());
        salida.setTour(tour);

        Embarcacion embarcacion = new Embarcacion();

        embarcacion.setId(
                datos.getEmbarcacionId());

        salida.setEmbarcacion(embarcacion);

        Usuario operador = new Usuario();
        operador.setId(datos.getOperadorId());
        salida.setOperador(operador);

        return salida;
    }

    private SalidaProgramadaRespuesta convertirARespuesta(
            SalidaProgramada salida) {

        var respuesta = new SalidaProgramadaRespuesta(
                salida.getId(),
                salida.getFecha(),
                salida.getHoraSalida(),
                salida.getCuposDisponibles(),
                salida.getEstado(),
                salida.getTour().getId(),
                salida.getTour().getNombre(),
                salida.getEmbarcacion().getId(),
                salida.getEmbarcacion().getNombre());
        respuesta.setPrecioPorPasajero(salida.getTour().getPrecioBase());
        respuesta.setDuracionMinutos(salida.getTour().getDuracionMinutos());
        respuesta.setInicioReal(salida.getInicioReal());
        respuesta.setFinReal(salida.getFinReal());
        if (salida.getOperador() != null) {
            respuesta.setOperadorId(salida.getOperador().getId());
            respuesta.setOperadorNombre(salida.getOperador().getNombre());
            respuesta.setOperadorApellido(salida.getOperador().getApellido());
        }
        respuesta.setTieneReservas(salidaProgramadaService.tieneReservas(salida.getId()));
        respuesta.setCambioOperativoConsumido(salidaProgramadaService.cambioOperativoConsumido(salida.getId()));
        respuesta.setPasajerosReservados(salidaProgramadaService.pasajerosReservados(salida.getId()));
        respuesta.setFechaOriginal(salida.getFechaOriginal());
        respuesta.setHoraOriginal(salida.getHoraOriginal());
        respuesta.setFechaAnterior(salida.getFechaAnterior());
        respuesta.setHoraAnterior(salida.getHoraAnterior());
        respuesta.setMotivoReprogramacion(salida.getMotivoReprogramacion());
        respuesta.setMotivoCancelacion(salida.getMotivoCancelacion());
        respuesta.setFechaCancelacion(salida.getFechaCancelacion());
        respuesta.setReservable(salida.getEstado() == com.seatour.seatour.model.EstadoSalida.PROGRAMADA
                && Boolean.TRUE.equals(salida.getTour().getActivo()) && salida.getCuposDisponibles() > 0
                && Boolean.TRUE.equals(salida.getEmbarcacion().getActivo())
                && java.time.LocalDateTime.of(salida.getFecha(), salida.getHoraSalida())
                    .isAfter(java.time.LocalDateTime.now(java.time.ZoneId.of("America/Lima"))));
        return respuesta;
    }
}
