package com.seatour.seatour;

import com.seatour.seatour.dto.UsuarioCreacion;
import com.seatour.seatour.model.*;
import com.seatour.seatour.repository.*;
import com.seatour.seatour.service.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:pagos-test;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.open-in-view=false"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.context.TestPropertySource(locations = "classpath:application-test.properties")
class PagoIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired ReservaRepository reservas;
    @Autowired PagoRepository pagos;
    @Autowired SalidaProgramadaRepository salidas;
    @Autowired TourRepository tours;
    @Autowired EmbarcacionRepository barcos;
    @Autowired CategoriaTourRepository categorias;
    @Autowired UsuarioRepository usuarios;
    @Autowired RolRepository roles;
    @Autowired UsuarioService usuarioService;
    @Autowired JdbcTemplate jdbc;
    Long salidaId;
    Long tourId;
    String cliente;
    String otro;
    String operador;
    String admin;

    @BeforeEach
    void preparar() throws Exception {
        pagos.deleteAll(); reservas.deleteAll(); salidas.deleteAll(); tours.deleteAll(); barcos.deleteAll(); categorias.deleteAll(); usuarios.deleteAll();
        cliente = usuario("cliente", "CLIENTE"); otro = usuario("otro", "CLIENTE");
        operador = usuario("operador", "OPERADOR"); admin = usuario("admin", "ADMIN");
        var categoria = new CategoriaTour(); categoria.setNombre("Mar"); categoria.setActivo(true);
        categorias.saveAndFlush(categoria);
        var tour = new Tour(); tour.setNombre("Paseo"); tour.setDescripcion("Paseo marino");
        tour.setDuracionMinutos(60); tour.setPrecioBase(new BigDecimal("80.25")); tour.setActivo(true); tour.setCategoriaTour(categoria);
        tourId = tours.saveAndFlush(tour).getId();
        var barco = new Embarcacion(); barco.setNombre("Barco"); barco.setMatricula("RES-01"); barco.setCapacidad(4); barco.setEstado("ACTIVA");
        barcos.saveAndFlush(barco);
        var salida = new SalidaProgramada(); salida.setTour(tour); salida.setEmbarcacion(barco);
        salida.setFecha(LocalDate.now(ZoneId.of("America/Lima")).plusDays(2)); salida.setHoraSalida(LocalTime.NOON);
        salida.setCuposDisponibles(4); salida.setEstado(EstadoSalida.PROGRAMADA);
        salidaId = salidas.saveAndFlush(salida).getId();
    }

    private String usuario(String nombre, String rol) throws Exception {
        Long id = usuarioService.crear(new UsuarioCreacion(nombre, "Prueba", nombre + "@example.com", "Clave123!")).id();
        var usuario = usuarios.findById(id).orElseThrow(); usuario.setRol(roles.findByNombre(rol).orElseThrow()); usuarios.saveAndFlush(usuario);
        var resultado = mvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"correo\":\"" + nombre + "@example.com\",\"password\":\"Clave123!\"}"))
                .andExpect(status().isOk()).andReturn();
        return "Bearer " + mapper.readTree(resultado.getResponse().getContentAsString()).get("token").asString();
    }
    private String solicitud(int pasajeros) {
        return "{\"salidaId\":" + salidaId + ",\"ninos\":0,\"adultos\":" + pasajeros + ",\"adultosMayores\":0}";
    }
    private Long crear(int pasajeros) throws Exception {
        var respuesta = mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json")
                .content(solicitud(pasajeros))).andExpect(status().isCreated()).andReturn().getResponse();
        return mapper.readTree(respuesta.getContentAsString()).get("id").asLong();
    }
    private int cupos() { return salidas.findById(salidaId).orElseThrow().getCuposDisponibles(); }

    private static final String TARJETA = """
            {"metodo":"TARJETA","tarjeta":{"numero":"5555555555554444","mes":12,
             "anio":2099,"cvv":"123","titular":"Cliente Prueba"}}
            """;
    private static final String YAPE = """
            {"metodo":"YAPE","yape":{"celular":"987654321","codigoAprobacion":"123456"}}
            """;
    private org.springframework.test.web.servlet.ResultActions pagar(Long id, String auth, String json) throws Exception {
        var request = post("/api/reservas/{id}/pagos", id).contentType("application/json").content(json);
        if (auth != null) request.header("Authorization", auth);
        return mvc.perform(request);
    }

    @ParameterizedTest
    @ValueSource(strings = {"TARJETA", "YAPE"})
    void apruebaConMontoHistoricoDelServidorSinDescontarCuposOtraVez(String metodo) throws Exception {
        Long id = crear(2);
        jdbc.update("update tours set precio_base = 100 where id = ?", tourId);
        String json = (metodo.equals("TARJETA") ? TARJETA : YAPE).strip();
        json = json.substring(0, json.length() - 1) + ",\"monto\":0.01}";
        pagar(id, cliente, json).andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoPago").value("APROBADO"))
                .andExpect(jsonPath("$.estadoReserva").value("CONFIRMADA"))
                .andExpect(jsonPath("$.reservaId").value(id))
                .andExpect(jsonPath("$.pagoId").isNumber())
                .andExpect(jsonPath("$.metodo").value(metodo))
                .andExpect(jsonPath("$.monto").value(160.50))
                .andExpect(jsonPath("$.referencia").isString())
                .andExpect(jsonPath("$.mensaje").isString());
        assertEquals(2, cupos());
        assertEquals(EstadoReserva.CONFIRMADA, reservas.findById(id).orElseThrow().getEstado());
        pagar(id, cliente, YAPE).andExpect(status().isConflict());
        assertEquals(1, pagos.count());
        var pago = pagos.findAll().getFirst();
        assertEquals(metodo.equals("TARJETA") ? "4444" : null, pago.getUltimos4());
        assertEquals(metodo.equals("TARJETA") ? "MASTERCARD" : null, pago.getMarca());
        var columnas = jdbc.queryForList("select * from pagos").getFirst().toString();
        assertFalse(columnas.contains("5555555555554444"));
        assertFalse(columnas.toLowerCase().contains("cvv"));
        assertFalse(columnas.contains("987654321"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"TARJETA", "YAPE"})
    void rechazaConservandoReservaYCuposYPermiteReintentar(String metodo) throws Exception {
        Long id = crear(1);
        String json = metodo.equals("TARJETA") ? TARJETA.replace("5555555555554444", "4111111111111111")
                : YAPE.replace("123456", "123457");
        for (int i = 0; i < 2; i++) pagar(id, cliente, json).andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoPago").value("RECHAZADO"))
                .andExpect(jsonPath("$.estadoReserva").value("PENDIENTE"))
                .andExpect(jsonPath("$.motivoRechazo").value("RECHAZO_SIMULADO"));
        assertEquals(3, cupos());
        assertEquals(EstadoReserva.PENDIENTE, reservas.findById(id).orElseThrow().getEstado());
        pagar(id, cliente, YAPE).andExpect(status().isOk());
        assertEquals(1, pagos.countByReservaIdAndEstado(id, EstadoPago.APROBADO));
        assertEquals(2, pagos.countByReservaIdAndEstado(id, EstadoPago.RECHAZADO));
    }

    @Test
    void protegePropiedadRolSesionYEstado() throws Exception {
        Long id = crear(1);
        pagar(id, null, YAPE).andExpect(status().isUnauthorized());
        pagar(id, "Bearer invalido", YAPE).andExpect(status().isUnauthorized());
        pagar(id, otro, YAPE).andExpect(status().isNotFound());
        pagar(id, operador, YAPE).andExpect(status().isForbidden());
        pagar(id, admin, YAPE).andExpect(status().isForbidden());
        pagar(999999L, cliente, YAPE).andExpect(status().isNotFound());
        mvc.perform(post("/api/reservas/{id}/cancelar", id).header("Authorization", cliente)).andExpect(status().isOk());
        pagar(id, cliente, YAPE).andExpect(status().isConflict());
        id = crear(1);
        mvc.perform(post("/api/reservas/{id}/confirmar", id).header("Authorization", operador)).andExpect(status().isOk());
        pagar(id, cliente, YAPE).andExpect(status().isConflict());
        assertEquals(0, pagos.count());
    }

    @Test
    void validaTarjetaYapeSinGuardarIntentosInvalidos() throws Exception {
        Long id = crear(1);
        for (String json : List.of(
                TARJETA.replace("5555555555554444", "5555555555554445"),
                TARJETA.replace("5555555555554444", "0000000000000000"),
                TARJETA.replace("5555555555554444", "123456789012"),
                TARJETA.replace("5555555555554444", "12345678901234567890"),
                TARJETA.replace("5555555555554444", "5555 5555 5555 4444"),
                TARJETA.replace("12", "0"), TARJETA.replace("12", "13"),
                TARJETA.replace("2099", "2000"), TARJETA.replace("2099", "null"),
                TARJETA.replace("123", "12"), TARJETA.replace("123", "12345"),
                TARJETA.replace("Cliente Prueba", " "),
                YAPE.replace("987654321", "887654321"), YAPE.replace("987654321", "98765432"),
                YAPE.replace("123456", ""), YAPE.replace("123456", "ABCDEF"),
                "{}", "{\"metodo\":\"YAPE\"}")) {
            pagar(id, cliente, json).andExpect(status().isBadRequest());
        }
        assertEquals(0, pagos.count());
        assertEquals(3, cupos());
        var hoy = YearMonth.now(ZoneId.of("America/Lima"));
        pagar(id, cliente, TARJETA.replace("2099", String.valueOf(hoy.getYear()))
                .replace("\"mes\":12", "\"mes\":" + hoy.getMonthValue()).replace("123", "1234"))
                .andExpect(status().isOk());
    }

    @Test
    void falloDeConfirmacionReviertePagoCompleto() throws Exception {
        Long id = crear(1);
        jdbc.update("update tours set activo = false where id = ?", tourId);
        pagar(id, cliente, YAPE).andExpect(status().isConflict());
        assertEquals(0, pagos.count());
        assertEquals(EstadoReserva.PENDIENTE, reservas.findById(id).orElseThrow().getEstado());
        assertEquals(3, cupos());
    }

    @Test
    void dosPagosConcurrentesSoloApruebanUno() throws Exception {
        Long id = crear(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var inicio = new CountDownLatch(1);
            Callable<Integer> intento = () -> {
                inicio.await();
                return pagar(id, cliente, YAPE).andReturn().getResponse().getStatus();
            };
            var a = pool.submit(intento); var b = pool.submit(intento); inicio.countDown();
            var estados = new ArrayList<>(List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS)));
            Collections.sort(estados);
            assertEquals(List.of(200, 409), estados);
        }
        assertEquals(1, pagos.countByReservaIdAndEstado(id, EstadoPago.APROBADO));
        assertEquals(3, cupos());
    }
}
