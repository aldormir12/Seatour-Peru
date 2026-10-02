package com.seatour.seatour.service;

import com.seatour.seatour.dto.LoginRespuesta;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.concurrent.locks.ReentrantReadWriteLock;

@Service
public class ModoDemoService {
    // Desactivado en cada arranque; el cliente no decide qué validaciones omitir.
    private volatile boolean activo = false;
    private final ReentrantReadWriteLock bloqueo = new ReentrantReadWriteLock(true);
    private final LimpiezaDemoService limpieza;

    public ModoDemoService(LimpiezaDemoService limpieza) { this.limpieza = limpieza; }

    public boolean activo() { return activo; }
    public java.util.concurrent.locks.Lock bloqueoAcciones() { return bloqueo.readLock(); }

    public boolean cambiar(boolean valor, LoginRespuesta actor) {
        if (actor == null || !"ADMIN".equals(actor.rol()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo ADMIN puede cambiar Modo Demo");
        var escritura = bloqueo.writeLock();
        escritura.lock();
        try {
            // Cada activación comienza vacía, incluso si el proceso anterior terminó sin desactivar.
            // La transacción de limpieza debe confirmar antes de cambiar el interruptor.
            if (!valor || !activo) limpieza.eliminarSalidasDemo();
            activo = valor;
            return activo;
        }
        finally { escritura.unlock(); }
    }

    public void exigirActivo() {
        if (!activo) throw new ResponseStatusException(HttpStatus.CONFLICT, "Modo Demo está desactivado");
    }
}
