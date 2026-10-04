package com.seatour.seatour.service;

import com.seatour.seatour.model.Adicional;
import com.seatour.seatour.model.TipoCobro;
import com.seatour.seatour.model.Tour;
import com.seatour.seatour.repository.AdicionalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

@Service
public class AdicionalesBaseService {
    private final AdicionalRepository adicionales;

    public AdicionalesBaseService(AdicionalRepository adicionales) {
        this.adicionales = adicionales;
    }

    @Transactional
    public void garantizarPara(Collection<Tour> tours) {
        garantizar("Traslado desde hotel", "Traslado desde el hotel para los pasajeros de la reserva.",
                new BigDecimal("5.00"), TipoCobro.POR_PERSONA, tours);
        garantizar("Almuerzo", "Comida para los pasajeros de la reserva.",
                new BigDecimal("15.00"), TipoCobro.POR_PERSONA, tours);
        var fotografia = garantizar("Fotograf\u00eda profesional", "Servicio de fotograf\u00eda para la reserva.",
                new BigDecimal("15.00"), TipoCobro.POR_RESERVA, tours);
        if (fotografia.getTipoCobro() == TipoCobro.POR_PERSONA) {
            fotografia.configurar(fotografia.getNombre(), fotografia.getDescripcion(), fotografia.getPrecio(),
                    TipoCobro.POR_RESERVA, fotografia.isActivo(), List.copyOf(fotografia.getTours()));
        }
    }

    private Adicional garantizar(String nombre, String descripcion, BigDecimal precio,
            TipoCobro tipoCobro, Collection<Tour> tours) {
        var adicional = adicionales.buscarBaseParaAsociar(nombre).orElseGet(() -> {
            var nuevo = new Adicional(nombre);
            nuevo.configurar(nombre, descripcion, precio, tipoCobro, true, List.of());
            return adicionales.save(nuevo);
        });
        // Conservar la configuración existente y añadir solamente las asociaciones faltantes.
        adicional.asociarTours(tours);
        return adicional;
    }
}
