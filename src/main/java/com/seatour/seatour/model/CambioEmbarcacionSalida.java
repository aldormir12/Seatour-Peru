package com.seatour.seatour.model;

import jakarta.persistence.Embeddable;
import java.time.LocalDateTime;

@Embeddable
public class CambioEmbarcacionSalida {
    private Long embarcacionAnteriorId;
    private Long embarcacionNuevaId;
    private String motivo;
    private LocalDateTime fechaHora;

    protected CambioEmbarcacionSalida() {}
    public CambioEmbarcacionSalida(Long anterior, Long nueva, String motivo, LocalDateTime fechaHora) {
        this.embarcacionAnteriorId = anterior;
        this.embarcacionNuevaId = nueva;
        this.motivo = motivo;
        this.fechaHora = fechaHora;
    }
    public Long getEmbarcacionAnteriorId() { return embarcacionAnteriorId; }
    public Long getEmbarcacionNuevaId() { return embarcacionNuevaId; }
    public String getMotivo() { return motivo; }
    public LocalDateTime getFechaHora() { return fechaHora; }
}
