package com.seatour.seatour.repository;

import com.seatour.seatour.model.Rol;
import jakarta.persistence.EntityManager;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class RolRepositoryTest {

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private EntityManager entityManager;

    @ParameterizedTest
    @ValueSource(strings = {"CLIENTE", "OPERADOR", "ADMIN"})
    void guardaRolConIdAutogeneradoYLoBuscaPorNombre(String nombre) {
        Rol rol = nuevoRol(nombre);
        assertNull(rol.getId());

        Rol guardado = rolRepository.saveAndFlush(rol);
        Long id = guardado.getId();
        assertNotNull(id);
        entityManager.clear();

        Rol encontrado = rolRepository.findByNombre(nombre).orElseThrow();
        assertEquals(id, encontrado.getId());
        assertEquals(nombre, encontrado.getNombre());
    }

    @Test
    void devuelveVacioCuandoElNombreNoExiste() {
        assertTrue(rolRepository.findByNombre("INEXISTENTE").isEmpty());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t\n"})
    void rechazaNombreNuloVacioOEnBlanco(String nombre) {
        assertThrows(ConstraintViolationException.class,
                () -> rolRepository.saveAndFlush(nuevoRol(nombre)));
    }

    @Test
    void rechazaNombresDuplicados() {
        rolRepository.saveAndFlush(nuevoRol("CLIENTE"));

        assertThrows(DataIntegrityViolationException.class,
                () -> rolRepository.saveAndFlush(nuevoRol("CLIENTE")));
    }

    private Rol nuevoRol(String nombre) {
        Rol rol = new Rol();
        rol.setNombre(nombre);
        return rol;
    }
}
