package com.seatour.seatour.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.Instant;

@Entity
@Table(name = "resenas", uniqueConstraints = @UniqueConstraint(name = "uk_resena_reserva", columnNames = "reserva_id"),
        indexes = @Index(name = "idx_resena_tour", columnList = "tour_id"))
public class Resena {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reserva_id", nullable = false, updatable = false)
    private Reserva reserva;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false, updatable = false)
    private Tour tour;
    @Min(1) @Max(5)
    @Column(nullable = false, updatable = false)
    private int puntuacion;
    @Size(max = 2000)
    @Column(length = 2000, updatable = false)
    private String comentario;
    @Column(nullable = false, updatable = false)
    private Instant creadaEn;

    protected Resena() {}
    public Resena(Reserva reserva, int puntuacion, String comentario) {
        this.reserva = reserva;
        this.tour = reserva.getSalida().getTour();
        this.puntuacion = puntuacion;
        this.comentario = comentario;
        this.creadaEn = Instant.now();
    }
    public Long getId() { return id; }
    public Reserva getReserva() { return reserva; }
    public Tour getTour() { return tour; }
    public int getPuntuacion() { return puntuacion; }
    public String getComentario() { return comentario; }
    public Instant getCreadaEn() { return creadaEn; }
}
