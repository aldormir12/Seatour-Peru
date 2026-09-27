package com.seatour.seatour.config;

import com.seatour.seatour.model.Rol;
import com.seatour.seatour.repository.RolRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Component
@Order(0)
public class RolesIniciales implements ApplicationRunner {
    private final RolRepository roles;

    public RolesIniciales(RolRepository roles) { this.roles = roles; }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (String nombre : List.of("CLIENTE", "OPERADOR", "ADMIN")) {
            if (roles.findByNombre(nombre).isEmpty()) {
                Rol rol = new Rol();
                rol.setNombre(nombre);
                roles.save(rol);
            }
        }
    }
}
