package com.seatour.seatour;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.*;
import com.seatour.seatour.repository.RolRepository;
import com.seatour.seatour.repository.UsuarioRepository;
import com.seatour.seatour.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:autorizacion-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.context.TestPropertySource(locations = "classpath:application-test.properties")
@Import(AutorizacionIntegrationTest.EmbarcacionesProbe.class)
class AutorizacionIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UsuarioService usuariosService;
    @Autowired UsuarioRepository usuarios;
    @Autowired RolRepository roles;
    // Controllers reales y cadena JWT real; se aisla la logica operativa de negocio.
    @MockitoBean TourService tours;
    @MockitoBean CategoriaTourService categorias;
    @MockitoBean SalidaProgramadaService salidas;

    private Long usuarioId;
    private static final String TOUR = """
            {"nombre":"Tour","descripcion":"Paseo","duracionMinutos":60,
             "precioBase":50,"activo":true,"categoriaId":1,"imagenUrl":"/api/tours/imagenes/fixture.jpg"}
            """;

    // Probe de la ruta antigua; el CRUD productivo esta en /api/admin/embarcaciones.
    @TestConfiguration(proxyBeanMethods = false)
    @RestController
    static class EmbarcacionesProbe {
        @RequestMapping(value = {"/api/embarcaciones", "/api/embarcaciones/{id}"},
                method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
                        RequestMethod.PATCH, RequestMethod.DELETE})
        ResponseEntity<Void> gestion() {
            return ResponseEntity.noContent().build();
        }
    }

    @BeforeEach
    void preparar() {
        usuarios.deleteAll();
        usuarioId = usuariosService.crear(new UsuarioCreacion("Ana", "Perez", "ana@example.com", "Clave123!")).id();
        CategoriaTour categoria = new CategoriaTour();
        categoria.setId(1L);
        categoria.setNombre("Categoria");
        categoria.setActivo(true);
        Tour tour = new Tour();
        tour.setId(1L);
        tour.setNombre("Tour");
        tour.setDescripcion("Paseo");
        tour.setDuracionMinutos(60);
        tour.setPrecioBase(BigDecimal.valueOf(50));
        tour.setActivo(true);
        tour.setCategoriaTour(categoria);
        Embarcacion barco = new Embarcacion();
        barco.setId(1L);
        barco.setNombre("Barco");
        SalidaProgramada salida = new SalidaProgramada();
        salida.setId(1L);
        salida.setTour(tour);
        salida.setEmbarcacion(barco);
        salida.setFecha(LocalDate.now().plusDays(1));
        salida.setHoraSalida(LocalTime.NOON);
        salida.setCuposDisponibles(5);
        salida.setEstado(EstadoSalida.PROGRAMADA);
        when(tours.listarTodos()).thenReturn(List.of(TourRespuesta.desde(tour)));
        when(tours.listarActivos()).thenReturn(List.of(TourRespuesta.desde(tour)));
        when(tours.crear(any())).thenReturn(TourRespuesta.desde(tour));
        when(tours.actualizar(eq(1L), any())).thenReturn(TourRespuesta.desde(tour));
        when(categorias.listarActivas()).thenReturn(List.of(CategoriaTourRespuesta.desde(categoria)));
        when(categorias.crear(any())).thenReturn(CategoriaTourRespuesta.desde(categoria));
        when(salidas.listarTodas()).thenReturn(List.of(salida));
        when(salidas.buscarPorId(1L)).thenReturn(salida);
        when(salidas.listarPorTour(1L)).thenReturn(List.of(salida));
        when(salidas.listarDisponiblesPorTour(1L)).thenReturn(List.of(salida));
        when(salidas.crear(any())).thenReturn(salida);
        when(salidas.actualizar(eq(1L), any())).thenReturn(salida);
    }

    private String token(String rol) throws Exception {
        var usuario = usuarios.findById(usuarioId).orElseThrow();
        usuario.setRol(roles.findByNombre(rol).orElseThrow());
        usuarios.saveAndFlush(usuario);
        var result = mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content("{\"correo\":\"ana@example.com\",\"password\":\"Clave123!\"}"))
                .andExpect(status().isOk()).andReturn();
        return "Bearer " + mapper.readTree(result.getResponse().getContentAsString()).get("token").asString();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/tours", "/api/categorias", "/api/salidas", "/api/salidas/1",
            "/api/salidas/tour/1", "/api/salidas/tour/1/disponibles"})
    void visitanteConsultaRecursosPublicos(String ruta) throws Exception {
        mvc.perform(get(ruta)).andExpect(status().isOk());
        mvc.perform(head(ruta)).andExpect(status().isOk());
    }

    static Stream<String> operacionesProtegidas() {
        return Stream.concat(Stream.of("tours", "categorias", "salidas", "embarcaciones")
                .flatMap(recurso -> Stream.of("POST /api/" + recurso, "PUT /api/" + recurso + "/1",
                        "PATCH /api/" + recurso + "/1", "DELETE /api/" + recurso + "/1")),
                Stream.of("GET /api/admin/embarcaciones", "POST /api/admin/embarcaciones",
                        "PUT /api/admin/embarcaciones/1", "PATCH /api/admin/embarcaciones/1/estado",
                        "DELETE /api/admin/embarcaciones/1", "POST /api/admin/embarcaciones/imagen",
                        "GET /api/embarcaciones/imagenes/imagen.jpg", "HEAD /api/embarcaciones/imagenes/imagen.jpg",
                        "GET /api/embarcaciones", "GET /api/usuarios", "GET /api/usuarios/1",
                        "HEAD /api/usuarios", "POST /api/usuarios/1"));
    }

    @ParameterizedTest
    @MethodSource("operacionesProtegidas")
    void visitanteNoPuedeGestionar(String operacion) throws Exception {
        String[] partes = operacion.split(" ");
        var resultado = mvc.perform(request(HttpMethod.valueOf(partes[0]), partes[1])
                        .contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized()).andReturn();
        assertNull(resultado.getRequest().getSession(false));
        verifyNoInteractions(tours, categorias, salidas);
    }

    @ParameterizedTest
    @MethodSource("operacionesProtegidas")
    void clienteNoPuedeGestionar(String operacion) throws Exception {
        String[] partes = operacion.split(" ");
        var resultado = mvc.perform(request(HttpMethod.valueOf(partes[0]), partes[1])
                        .header("Authorization", token("CLIENTE")).contentType("application/json").content("{}"))
                .andExpect(status().isForbidden()).andReturn();
        assertNull(resultado.getRequest().getSession(false));
        assertNull(resultado.getResponse().getCookie("JSESSIONID"));
        verifyNoInteractions(tours, categorias, salidas);
    }

    @ParameterizedTest
    @ValueSource(strings = {"OPERADOR", "ADMIN"})
    void permisosDeGestionRespetanElRol(String rol) throws Exception {
        String auth = token(rol);
        mvc.perform(post("/api/admin/categorias").header("Authorization", auth).contentType("application/json")
                        .content("{\"nombre\":\"Categoria\",\"activo\":true}"))
                .andExpect(status().is("ADMIN".equals(rol) ? 201 : 403));
        mvc.perform(post("/api/admin/tours").header("Authorization", auth).contentType("application/json").content(TOUR))
                .andExpect(status().is("ADMIN".equals(rol) ? 201 : 403));
        mvc.perform(put("/api/admin/tours/1").header("Authorization", auth).contentType("application/json").content(TOUR))
                .andExpect(status().is("ADMIN".equals(rol) ? 200 : 403));
        String salida = """
                {"fecha":"%s","horaSalida":"12:00:00","cuposDisponibles":5,
                 "estado":"PROGRAMADA","tourId":1,"embarcacionId":1}
                """.formatted(LocalDate.now().plusDays(1));
        mvc.perform(post("/api/salidas").header("Authorization", auth).contentType("application/json").content(salida))
                .andExpect(status().isCreated());
        mvc.perform(put("/api/salidas/1").header("Authorization", auth).contentType("application/json").content(salida))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/salidas/1").header("Authorization", auth)).andExpect(status().isNoContent());
        verify(categorias, times("ADMIN".equals(rol) ? 1 : 0)).crear(any());
        verify(tours, times("ADMIN".equals(rol) ? 1 : 0)).crear(any());
        verify(tours, times("ADMIN".equals(rol) ? 1 : 0)).actualizar(eq(1L), any());
        verify(salidas).crear(any());
        verify(salidas).actualizar(eq(1L), any());
        verify(salidas).eliminar(1L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"OPERADOR", "ADMIN"})
    void reglaEmbarcacionesSoloPermiteAdmin(String rol) throws Exception {
        String auth = token(rol);
        for (HttpMethod metodo : List.of(HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH, HttpMethod.DELETE)) {
            mvc.perform(request(metodo, "/api/embarcaciones/1").header("Authorization", auth))
                    .andExpect(status().is("ADMIN".equals(rol) ? 204 : 403));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"GET /api/admin/embarcaciones", "POST /api/admin/embarcaciones",
            "PUT /api/admin/embarcaciones/1", "PATCH /api/admin/embarcaciones/1/estado",
            "DELETE /api/admin/embarcaciones/1", "POST /api/admin/embarcaciones/imagen",
            "GET /api/embarcaciones/imagenes/imagen.jpg", "HEAD /api/embarcaciones/imagenes/imagen.jpg"})
    void operadorNoPuedeGestionarEmbarcaciones(String operacion) throws Exception {
        String[] partes = operacion.split(" ");
        mvc.perform(request(HttpMethod.valueOf(partes[0]), partes[1])
                .header("Authorization", token("OPERADOR")).contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminConsultaUsuariosSinExponerPassword() throws Exception {
        String auth = token("ADMIN");
        mvc.perform(get("/api/usuarios").header("Authorization", auth)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].password").doesNotExist());
        mvc.perform(get("/api/usuarios/{id}", usuarioId).header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(usuarioId))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void operadorNoAdministraUsuarios() throws Exception {
        String auth = token("OPERADOR");
        mvc.perform(get("/api/usuarios").header("Authorization", auth)).andExpect(status().isForbidden())
                .andExpect(content().json("{\"mensaje\":\"Acceso denegado\"}"));
        mvc.perform(get("/api/usuarios/{id}", usuarioId).header("Authorization", auth)).andExpect(status().isForbidden());
    }

    @Test
    void cambioDeRolRevocaPermisoConElMismoJwt() throws Exception {
        String auth = token("ADMIN");
        mvc.perform(post("/api/admin/tours").header("Authorization", auth).contentType("application/json").content(TOUR))
                .andExpect(status().isCreated());
        var usuario = usuarios.findById(usuarioId).orElseThrow();
        usuario.setRol(roles.findByNombre("CLIENTE").orElseThrow());
        usuarios.saveAndFlush(usuario);
        mvc.perform(post("/api/admin/tours").header("Authorization", auth).contentType("application/json").content(TOUR))
                .andExpect(status().isForbidden());
        verify(tours, times(1)).crear(any());
    }

    @Test
    void tokenInvalidoSigueSiendo401() throws Exception {
        mvc.perform(post("/api/admin/tours").header("Authorization", "Bearer invalido")
                        .contentType("application/json").content(TOUR))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"mensaje\":\"No autorizado\"}"));
        verifyNoInteractions(tours);
    }

    @Test
    void registroPublicoSigueCreandoSoloClientes() throws Exception {
        mvc.perform(post("/api/usuarios").contentType("application/json").content("""
                {"nombre":"Nuevo","apellido":"Usuario","correo":"nuevo@example.com",
                 "password":"Clave123!","rol":"ADMIN"}
                """))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.rol").value("CLIENTE"));
    }
}
