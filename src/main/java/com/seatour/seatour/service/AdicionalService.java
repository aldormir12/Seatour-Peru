package com.seatour.seatour.service;
import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.*;
import com.seatour.seatour.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@Service
@Transactional(readOnly = true)
public class AdicionalService {
    private final AdicionalRepository adicionales;
    private final TourRepository tours;
    public AdicionalService(AdicionalRepository adicionales, TourRepository tours) { this.adicionales = adicionales; this.tours = tours; }
    public List<AdicionalRespuesta> disponibles(Long tourId) {
        if (!tours.existsById(tourId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tour no encontrado");
        return adicionales.disponibles(tourId).stream().map(AdicionalRespuesta::desde).toList();
    }
    public List<AdicionalRespuesta> listar() {
        return adicionales.findAllByOrderByNombreAsc().stream().map(AdicionalRespuesta::desde).toList();
    }
    @Transactional
    public AdicionalRespuesta configurar(Long id, AdicionalSolicitud datos) {
        var a = adicionales.bloquear(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Adicional no encontrado"));
        var asociados = tours.findAllById(datos.tourIds());
        if (asociados.size() != datos.tourIds().size()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uno de los tours no existe");
        a.configurar(datos.nombre(), datos.descripcion(), datos.precio(), datos.tipoCobro(), datos.activo(), asociados);
        return AdicionalRespuesta.desde(adicionales.saveAndFlush(a));
    }
    @Transactional(propagation = Propagation.MANDATORY)
    public List<ReservaAdicional> seleccionar(Long tourId, int pasajeros, List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        if (ids.size() > 50 || ids.stream().anyMatch(id -> id == null || id <= 0) || new HashSet<>(ids).size() != ids.size())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccion de adicionales invalida");
        List<ReservaAdicional> elegidos = new ArrayList<>();
        for (Long id : ids.stream().sorted().toList()) {
            var a = adicionales.bloquear(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Adicional no disponible"));
            if (!a.isActivo() || a.getPrecio() == null || a.getPrecio().signum() < 0 || a.getTipoCobro() == null
                    || a.getTours().stream().noneMatch(t -> t.getId().equals(tourId)))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Adicional no disponible para este tour");
            elegidos.add(new ReservaAdicional(a, pasajeros));
        }
        return elegidos;
    }
}
