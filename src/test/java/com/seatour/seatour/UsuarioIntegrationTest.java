package com.seatour.seatour;

import com.seatour.seatour.config.RolesIniciales;
import com.seatour.seatour.dto.UsuarioCreacion;
import com.seatour.seatour.model.Usuario;
import com.seatour.seatour.repository.RolRepository;
import com.seatour.seatour.repository.UsuarioRepository;
import com.seatour.seatour.service.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.*;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:usuarios-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
@org.springframework.test.context.ActiveProfiles("test")
@org.springframework.test.context.TestPropertySource(locations = "classpath:application-test.properties")
class UsuarioIntegrationTest {
    @Autowired
    MockMvc mvc;
    @Autowired
    UsuarioRepository usuarios;
    @Autowired
    RolRepository roles;
    @Autowired
    UsuarioService servicio;
    @Autowired
    RolesIniciales iniciales;
    @Autowired
    PasswordEncoder encoder;
    @Autowired
    com.seatour.seatour.security.JwtService jwtService;

    private String tokenAdmin(Long id) {
        Usuario usuario = usuarios.findById(id).orElseThrow();
        usuario.setRol(roles.findByNombre("ADMIN").orElseThrow());
        usuarios.saveAndFlush(usuario);
        return "Bearer " + jwtService.generarToken(new com.seatour.seatour.security.UsuarioPrincipal(usuario));
    }

    @BeforeEach
    void preparar() {
        usuarios.deleteAll();
        iniciales.run(null);
    }

    private UsuarioCreacion datos(String correo) {
        return new UsuarioCreacion("Ana", "Perez", correo, "Clave de prueba 123!");
    }

    private String json(String correo) {
        return """
                {"nombre":"Ana","apellido":"Perez","correo":"%s","password":"Clave de prueba 123!"}
                """.formatted(correo);
    }

    @Test
    void creaClienteActivoConHashYRelacionCompartida() {
        var primero = servicio.crear(datos("ANA@example.com"));
        var segundo = servicio.crear(datos("otra@example.com"));
        Usuario usuario = usuarios.findById(primero.id()).orElseThrow();
        Usuario otro = usuarios.findById(segundo.id()).orElseThrow();
        assertEquals("CLIENTE", primero.rol());
        assertTrue(primero.activo());
        assertEquals(roles.findByNombre("CLIENTE").orElseThrow().getId(), usuario.getRol().getId());
        assertEquals(usuario.getRol().getId(), otro.getRol().getId());
        assertNotEquals(datos("").password(), usuario.getPassword());
        assertTrue(encoder.matches(datos("").password(), usuario.getPassword()));
        assertNotEquals(usuario.getPassword(), otro.getPassword());
        assertFalse(encoder.matches("incorrecta", usuario.getPassword()));
        assertTrue(usuarios.existsByCorreo("ana@example.com"));
        assertEquals(primero.id(), servicio.buscarPorCorreo(" ANA@EXAMPLE.COM ").orElseThrow().id());
        assertTrue(servicio.buscarPorCorreo("ausente@example.com").isEmpty());
    }

    @Test
    void apiDevuelveDtosSinPasswordEnCreacionDetalleYListado() throws Exception {
        mvc.perform(post("/api/usuarios").contentType("application/json").content(json("ana@example.com")))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/api/usuarios/")))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.rol").value("CLIENTE"))
                .andExpect(jsonPath("$.activo").value(true));
        Long id = usuarios.findByCorreo("ana@example.com").orElseThrow().getId();
        String token = tokenAdmin(id);
        mvc.perform(get("/api/usuarios/{id}", id).header("Authorization", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.correo").value("ana@example.com"));
        mvc.perform(get("/api/usuarios").header("Authorization", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].password").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = { "ADMIN", "OPERADOR" })
    void noPermiteAsignarRolNiEstadoDesdeRegistro(String rol) throws Exception {
        String solicitud = json("ana@example.com").stripTrailing();
        solicitud = solicitud.substring(0, solicitud.length() - 1)
                + ",\"rol\":\"" + rol + "\",\"rolId\":999,\"activo\":false}";
        mvc.perform(post("/api/usuarios").contentType("application/json").content(solicitud))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rol").value("CLIENTE"))
                .andExpect(jsonPath("$.activo").value(true));
        var usuario = servicio.buscarPorCorreo("ana@example.com").orElseThrow();
        assertEquals("CLIENTE", usuario.rol());
        assertTrue(usuario.activo());
    }

    @Test
    void rechazaCorreoDuplicadoCon409() throws Exception {
        servicio.crear(datos("ana@example.com"));
        mvc.perform(post("/api/usuarios").contentType("application/json").content(json("ANA@example.com")))
                .andExpect(status().isConflict())
                .andExpect(content().string(not(containsString("Clave de prueba"))));
        assertEquals(1, usuarios.count());
    }

    @Test
    void baseDeDatosImpideCorreoDuplicado() {
        var creado = servicio.crear(datos("ana@example.com"));
        Usuario copia = new Usuario();
        copia.setNombre("Otro");
        copia.setApellido("Usuario");
        copia.setCorreo(creado.correo());
        copia.setPassword(encoder.encode("otra clave"));
        copia.setRol(roles.findByNombre("CLIENTE").orElseThrow());
        assertThrows(DataIntegrityViolationException.class, () -> usuarios.saveAndFlush(copia));
    }

    @Test
    void rolEsObligatorio() {
        Usuario usuario = new Usuario();
        usuario.setNombre("Ana");
        usuario.setApellido("Perez");
        usuario.setCorreo("ana@example.com");
        usuario.setPassword(encoder.encode("clave"));
        assertThrows(jakarta.validation.ConstraintViolationException.class,
                () -> usuarios.saveAndFlush(usuario));
    }

    @Test
    void devuelve404ParaUsuarioInexistente() throws Exception {
        var error = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> servicio.buscarPorId(Long.MAX_VALUE));

        assertEquals(
                org.springframework.http.HttpStatus.NOT_FOUND,
                error.getStatusCode());

        String token = tokenAdmin(servicio.crear(datos("admin@example.com")).id());
        mvc.perform(
                get("/api/usuarios/{id}", Long.MAX_VALUE).header("Authorization", token)).andExpect(
                        status().isNotFound());
    }

    @Test
    void rolesSeInicializanSinDuplicarseNiCambiarIds() {
        var antes = roles.findAll().stream().map(r -> r.getId()).sorted().toList();
        iniciales.run(null);
        iniciales.run(null);
        assertEquals(3, roles.count());
        assertEquals(antes, roles.findAll().stream().map(r -> r.getId()).sorted().toList());
        for (String nombre : new String[] { "CLIENTE", "OPERADOR", "ADMIN" }) {
            assertTrue(roles.findByNombre(nombre).isPresent());
        }
    }

    @Test
    void sinRolClienteDevuelve503YNoGuardaUsuario() throws Exception {
        roles.delete(roles.findByNombre("CLIENTE").orElseThrow());
        try {
            mvc.perform(post("/api/usuarios").contentType("application/json").content(json("ana@example.com")))
                    .andExpect(status().isServiceUnavailable());
            assertEquals(0, usuarios.count());
        } finally {
            iniciales.run(null);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{}",
            "{\"nombre\":\" \",\"apellido\":\"Perez\",\"correo\":\"ana@example.com\",\"password\":\"secreto\"}",
            "{\"nombre\":\"Ana\",\"apellido\":\" \",\"correo\":\"ana@example.com\",\"password\":\"secreto\"}",
            "{\"nombre\":\"Ana\",\"apellido\":\"Perez\",\"correo\":\"invalido\",\"password\":\"secreto\"}",
            "{\"nombre\":\"Ana\",\"apellido\":\"Perez\",\"correo\":\"ana@example.com\",\"password\":\" \"}"
    })
    void datosInvalidosDevuelven400SinFiltrarPassword(String solicitud) throws Exception {
        mvc.perform(post("/api/usuarios").contentType("application/json").content(solicitud))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(not(containsString("password"))))
                .andExpect(content().string(not(containsString("secreto"))));
        assertEquals(0, usuarios.count());
    }
}
