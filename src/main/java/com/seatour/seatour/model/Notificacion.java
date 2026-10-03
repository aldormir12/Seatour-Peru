package com.seatour.seatour.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notificaciones", uniqueConstraints = @UniqueConstraint(
        name = "uk_notificacion_usuario_clave", columnNames = {"usuario_id", "clave_deduplicacion"}),
        indexes = {
            @Index(name = "idx_notificacion_usuario_fecha", columnList = "usuario_id,creada_en,id"),
            @Index(name = "idx_notificacion_usuario_lectura", columnList = "usuario_id,leida_en")
        })
public class Notificacion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false, updatable = false)
    private Usuario usuario;
    @Column(name = "clave_deduplicacion", nullable = false, updatable = false, length = 200)
    private String claveDeduplicacion;
    @Column(nullable = false, updatable = false, length = 100)
    private String tipo;
    @Column(nullable = false, updatable = false, length = 200)
    private String titulo;
    @Column(nullable = false, updatable = false, length = 2000)
    private String mensaje;
    @Column(name = "creada_en", nullable = false, updatable = false)
    private Instant creadaEn;
    @Column(name = "leida_en")
    private Instant leidaEn;

    protected Notificacion() {}
    public Notificacion(Usuario usuario, String claveDeduplicacion, String tipo, String titulo, String mensaje) {
        this.usuario = usuario;
        this.claveDeduplicacion = claveDeduplicacion;
        this.tipo = tipo;
        this.titulo = titulo;
        this.mensaje = mensaje;
        this.creadaEn = Instant.now();
    }
    public Long getId() { return id; }
    public String getTipo() { return tipo; }
    public String getTitulo() { return titulo; }
    public String getMensaje() { return mensaje; }
    public Instant getCreadaEn() { return creadaEn; }
    public Instant getLeidaEn() { return leidaEn; }
    public boolean isLeida() { return leidaEn != null; }
}
