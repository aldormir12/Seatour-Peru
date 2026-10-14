package com.seatour.seatour.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.Duration;

/** Estado privado de seguridad, independiente de la existencia y del rol del usuario. */
@Entity
@Table(name = "intentos_login", indexes = @Index(name = "idx_intentos_login_ultimo_intento", columnList = "ultimo_intento"))
public class IntentoLogin {
    @Id @Column(length = 80, nullable = false)
    private String clave;
    @Column(nullable = false)
    private int fallos;
    @Column(name = "bloqueado_hasta")
    private Instant bloqueadoHasta;
    @Column(name = "ventana_desde", nullable = false)
    private Instant ventanaDesde;

    // Nullable para filas anteriores; la limpieza usa ventana_desde como respaldo.
    @Column(name = "ultimo_intento")
    private Instant ultimoIntento;

    protected IntentoLogin() {}

    public void registrarActividad(Instant ahora) { ultimoIntento = ahora; }

    public void actualizarPlazo(Instant ahora) {
        if (bloqueadoHasta != null && !ahora.isBefore(bloqueadoHasta)) {
            reiniciar(ahora);
        }
    }
    public boolean bloqueado(Instant ahora) {
        return bloqueadoHasta != null && ahora.isBefore(bloqueadoHasta);
    }
    public void fallo(Instant ahora, int limite) {
        fallos++;
        if (fallos >= limite) bloqueadoHasta = ahora.plus(Duration.ofMinutes(15));
    }
    public void reiniciar(Instant ahora) {
        fallos = 0;
        bloqueadoHasta = null;
        ventanaDesde = ahora;
    }
}
