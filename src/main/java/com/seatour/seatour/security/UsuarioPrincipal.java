package com.seatour.seatour.security;

import com.seatour.seatour.dto.LoginRespuesta;
import com.seatour.seatour.model.Usuario;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.List;

/** Instantanea del usuario autenticado, sin conservar entidades JPA. */
public class UsuarioPrincipal extends User {
    private final LoginRespuesta datos;

    public UsuarioPrincipal(Usuario usuario) {
        super(usuario.getCorreo(), usuario.getPassword(), usuario.isActivo(), true, true, true,
                List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getRol().getNombre())));
        datos = new LoginRespuesta(usuario.getId(), usuario.getNombre(), usuario.getCorreo(),
                usuario.getRol().getNombre());
    }

    public LoginRespuesta datos() {
        return datos;
    }
}
