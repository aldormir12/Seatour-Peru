package com.seatour.seatour.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "usuarios")
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String nombre;

    @NotBlank
    @Column(nullable = false)
    private String apellido;

    @NotBlank
    @Email
    @Column(nullable = false, unique = true)
    private String correo;

    @NotBlank
    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private boolean activo;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rol_id", nullable = false)
    private Rol rol;

    @ManyToMany
    @JoinTable(name = "usuario_categorias_favoritas",
            joinColumns = @JoinColumn(name = "usuario_id"),
            inverseJoinColumns = @JoinColumn(name = "categoria_id"))
    private java.util.Set<CategoriaTour> categoriasFavoritas = new java.util.LinkedHashSet<>();

    @Column(precision = 19, scale = 2)
    private java.math.BigDecimal presupuestoMaximo;

    // Las filas anteriores pueden tener null; se interpretan como no configuradas.
    private Boolean preferenciasConfiguradas = false;

    public boolean isPreferenciasConfiguradas() { return Boolean.TRUE.equals(preferenciasConfiguradas); }
    public void marcarPreferenciasConfiguradas() { preferenciasConfiguradas = true; }
    // Conserva la selección anterior hasta que el cliente vuelva a guardar.
    @Column(name = "horario_preferido", length = 100)
    private String horarioPreferidoAnterior;

    @ElementCollection
    @CollectionTable(name = "usuario_horarios_preferidos", joinColumns = @JoinColumn(name = "usuario_id"))
    @OrderColumn(name = "orden")
    @Column(name = "horario", nullable = false, length = 100)
    private java.util.List<String> horarioPreferido = new java.util.ArrayList<>();
    private Integer duracionPreferidaMinutos;
    @Column(length = 100)
    private String nivelActividad;
    @Column(length = 100)
    private String tipoGrupo;

    @ElementCollection
    @CollectionTable(name = "usuario_prioridades", joinColumns = @JoinColumn(name = "usuario_id"))
    @Column(name = "prioridad", nullable = false, length = 255)
    private java.util.Set<String> prioridades = new java.util.LinkedHashSet<>();

    @ElementCollection
    @CollectionTable(name = "usuario_restricciones", joinColumns = @JoinColumn(name = "usuario_id"))
    @Column(name = "restriccion", nullable = false, length = 255)
    private java.util.Set<String> restricciones = new java.util.LinkedHashSet<>();

    public java.util.Set<CategoriaTour> getCategoriasFavoritas() { return categoriasFavoritas; }
    public java.math.BigDecimal getPresupuestoMaximo() { return presupuestoMaximo; }
    public void setPresupuestoMaximo(java.math.BigDecimal valor) { presupuestoMaximo = valor; }
    public java.util.List<String> getHorarioPreferido() {
        if (horarioPreferido.isEmpty() && horarioPreferidoAnterior != null && !horarioPreferidoAnterior.isBlank())
            return java.util.List.of(horarioPreferidoAnterior);
        return java.util.List.copyOf(horarioPreferido);
    }
    public void setHorarioPreferido(java.util.List<String> valores) {
        horarioPreferido.clear();
        horarioPreferido.addAll(valores);
        horarioPreferidoAnterior = null;
    }
    public Integer getDuracionPreferidaMinutos() { return duracionPreferidaMinutos; }
    public void setDuracionPreferidaMinutos(Integer valor) { duracionPreferidaMinutos = valor; }
    public String getNivelActividad() { return nivelActividad; }
    public void setNivelActividad(String valor) { nivelActividad = valor; }
    public String getTipoGrupo() { return tipoGrupo; }
    public void setTipoGrupo(String valor) { tipoGrupo = valor; }
    public java.util.Set<String> getPrioridades() { return prioridades; }
    public java.util.Set<String> getRestricciones() { return restricciones; }

    public Usuario() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public Rol getRol() { return rol; }
    public void setRol(Rol rol) { this.rol = rol; }
}
