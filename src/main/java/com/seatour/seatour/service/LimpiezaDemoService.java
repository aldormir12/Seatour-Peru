package com.seatour.seatour.service;

import com.seatour.seatour.model.EstadoSalida;
import com.seatour.seatour.repository.SalidaProgramadaRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
public class LimpiezaDemoService {
    private final SalidaProgramadaRepository salidas;
    // Resolución diferida: LiveService consulta el mismo ModoDemoService.
    private final ObjectProvider<LiveService> live;

    public LimpiezaDemoService(SalidaProgramadaRepository salidas, ObjectProvider<LiveService> live) {
        this.salidas = salidas;
        this.live = live;
    }

    /** Se ejecuta con el bloqueo exclusivo de ModoDemoService. Solo selecciona esDemo=true. */
    @Transactional
    public void eliminarSalidasDemo() {
        var demos = salidas.listarDemo();
        for (var salida : demos) {
            if (salida.getEstado() == EstadoSalida.EN_CURSO) {
                live.getObject().desconectarDemo(salida);
                salida.setEstado(EstadoSalida.COMPLETADA);
                salida.setFinReal(LocalDateTime.now(ZoneId.of("America/Lima")));
            }
        }
        // Cerrar antes de borrar; deleteAll elimina también las colecciones de cada entidad.
        salidas.flush();
        salidas.deleteAll(demos);
        salidas.flush();
    }
}
