package com.seatour.seatour.service;

import com.seatour.seatour.dto.LoginRespuesta;
import com.seatour.seatour.dto.PreferenciasCliente;
import com.seatour.seatour.dto.ActualizarPreferenciasCliente;
import com.seatour.seatour.model.Usuario;
import com.seatour.seatour.repository.UsuarioRepository;
import com.seatour.seatour.repository.CategoriaTourRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Set;
import java.util.LinkedHashSet;

@Service
@Validated
@Transactional(readOnly = true)
public class PreferenciasClienteService {
    private final UsuarioRepository usuarios;
    private final CategoriaTourRepository categorias;

    public PreferenciasClienteService(UsuarioRepository usuarios, CategoriaTourRepository categorias) {
        this.usuarios = usuarios;
        this.categorias = categorias;
    }

    public PreferenciasCliente consultar(LoginRespuesta actor) {
        return respuesta(cliente(actor, false));
    }

    /** PUT reemplaza las preferencias: null limpia un valor y listas omitidas se vacían. */
    @Transactional
    public PreferenciasCliente actualizar(LoginRespuesta actor, @Valid ActualizarPreferenciasCliente datos) {
        Usuario usuario = cliente(actor, true);
        var ids = new LinkedHashSet<>(datos.categoriasFavoritas() == null ? List.<Long>of() : datos.categoriasFavoritas());
        var favoritas = categorias.findAllById(ids);
        var inexistentes = new LinkedHashSet<>(ids);
        favoritas.forEach(categoria -> inexistentes.remove(categoria.getId()));
        if (!inexistentes.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "categoriasFavoritas: no existen las categorías " + inexistentes);
        usuario.getCategoriasFavoritas().clear();
        usuario.getCategoriasFavoritas().addAll(favoritas);
        usuario.setPresupuestoMaximo(datos.presupuestoMaximo());
        if (new LinkedHashSet<>(datos.horarioPreferido()).size() != datos.horarioPreferido().size())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "horarioPreferido: selecciona horarios distintos");
        usuario.setHorarioPreferido(datos.horarioPreferido());
        usuario.setDuracionPreferidaMinutos(datos.duracionPreferidaMinutos());
        usuario.setNivelActividad(limpiar(datos.nivelActividad()));
        usuario.setTipoGrupo(limpiar(datos.tipoGrupo()));
        reemplazar(usuario.getPrioridades(), datos.prioridades());
        reemplazar(usuario.getRestricciones(), datos.restricciones());
        usuario.marcarPreferenciasConfiguradas();
        usuarios.saveAndFlush(usuario);
        return respuesta(usuario);
    }

    private Usuario cliente(LoginRespuesta actor, boolean bloquear) {
        if (actor == null || !"CLIENTE".equals(actor.rol()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo CLIENTE puede gestionar sus preferencias");
        Usuario usuario = (bloquear ? usuarios.bloquearPorId(actor.id()) : usuarios.findById(actor.id()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        if (!usuario.isActivo() || !"CLIENTE".equals(usuario.getRol().getNombre()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acceso denegado");
        return usuario;
    }

    private PreferenciasCliente respuesta(Usuario usuario) {
        return new PreferenciasCliente(usuario.getCategoriasFavoritas().stream().map(c -> c.getId()).sorted().toList(),
                usuario.getPresupuestoMaximo(), usuario.getHorarioPreferido(), usuario.getDuracionPreferidaMinutos(),
                usuario.getNivelActividad(), usuario.getTipoGrupo(),
                usuario.getPrioridades().stream().sorted().toList(), usuario.getRestricciones().stream().sorted().toList(),
                usuario.isPreferenciasConfiguradas());
    }

    private static String limpiar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

    private static void reemplazar(Set<String> destino, List<String> valores) {
        destino.clear();
        if (valores != null) valores.stream().map(String::trim).forEach(destino::add);
    }
}
