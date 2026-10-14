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
    "spring.datasource.url=jdbc:h2:mem:reservas-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;LOCK_TIMEOUT=10000",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.open-in-view=false"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.test.context.TestPropertySource(locations = "classpath:application-test.properties")
class ReservaIntegrationTest {
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
    @Autowired com.seatour.seatour.service.PlanReservaService planes;
    Long salidaId;
    Long tourId;
    String cliente;
    String otro;
    String operador;
    String admin;

    @BeforeEach
    void preparar() throws Exception {
        jdbc.update("delete from notificaciones");
        jdbc.update("delete from comprobantes_reserva");
        jdbc.update("delete from reserva_modificaciones");
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
        salida.setOperador(usuarios.findByCorreo("operador@example.com").orElseThrow());
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

    @Test
    void precioClienteYEstadoSonDelServidorYPrecioPermaneceHistorico() throws Exception {
        String json = solicitud(2).replace("}", ",\"clienteId\":999,\"precioUnitario\":0.01,\"precioTotal\":0.02,\"estado\":\"CONFIRMADA\"}");
        var resultado = mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json").content(json))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.precioUnitario").value(80.25)).andExpect(jsonPath("$.precioTotal").value(160.50))
                .andExpect(jsonPath("$.clienteNombre").value("cliente Prueba")).andReturn();
        Long id = mapper.readTree(resultado.getResponse().getContentAsString()).get("id").asLong();
        jdbc.update("update tours set precio_base = 100 where id = ?", tourId);
        mvc.perform(get("/api/reservas/{id}", id).header("Authorization", cliente))
                .andExpect(status().isOk()).andExpect(jsonPath("$.precioTotal").value(160.50));
        assertEquals(2, cupos());
        mvc.perform(get("/api/salidas/{id}", salidaId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.cuposDisponibles").value(2)).andExpect(jsonPath("$.precioPorPasajero").value(100));
    }

    @Test
    void aislaReservasAjenasYListadoPersonal() throws Exception {
        Long id = crear(1);
        mvc.perform(get("/api/reservas/mis-reservas").header("Authorization", cliente))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/reservas/mis-reservas").header("Authorization", otro))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/reservas/{id}", id).header("Authorization", otro)).andExpect(status().isNotFound());
        mvc.perform(post("/api/reservas/{id}/cancelar", id).header("Authorization", otro)).andExpect(status().isNotFound());
        assertEquals(3, cupos());
    }

    @Test
    void exigeJwtYRolEnEndpointsDeGestion() throws Exception {
        mvc.perform(post("/api/reservas").contentType("application/json").content(solicitud(1))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/reservas").header("Authorization", "Bearer invalido")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/reservas").header("Authorization", cliente)).andExpect(status().isForbidden());
        mvc.perform(post("/api/reservas").header("Authorization", operador).contentType("application/json").content(solicitud(1)))
                .andExpect(status().isForbidden());
        Long id = crear(1);
        mvc.perform(post("/api/reservas/{id}/confirmar", id).header("Authorization", cliente)).andExpect(status().isForbidden());
        for (String token : List.of(operador, admin)) {
            mvc.perform(get("/api/reservas").header("Authorization", token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
            mvc.perform(get("/api/reservas/{id}", id).header("Authorization", token)).andExpect(status().isOk());
        }
    }

    @Test
    void confirmaCancelaYNoDevuelveCuposDosVeces() throws Exception {
        Long id = crear(2);
        mvc.perform(post("/api/reservas/{id}/confirmar", id).header("Authorization", operador))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("CONFIRMADA"));
        assertEquals(2, cupos());
        mvc.perform(post("/api/reservas/{id}/confirmar", id).header("Authorization", admin)).andExpect(status().isConflict());
        for (String token : List.of(cliente, operador, admin)) {
            mvc.perform(post("/api/reservas/{id}/cancelar", id).header("Authorization", token))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("CANCELADA"));
        }
        assertEquals(4, cupos());
        mvc.perform(post("/api/reservas/{id}/confirmar", id).header("Authorization", operador)).andExpect(status().isConflict());
    }

    @Test
    void cancelaPendienteDesdeGestion() throws Exception {
        Long id = crear(1);
        mvc.perform(post("/api/reservas/{id}/cancelar", id).header("Authorization", admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("CANCELADA"));
        assertEquals(4, cupos());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"salidaId\":1,\"pasajeros\":0}", "{\"salidaId\":1,\"pasajeros\":-1}",
            "{\"salidaId\":null,\"pasajeros\":1}", "{\"salidaId\":1,\"pasajeros\":1.5}"})
    void rechazaDatosInvalidos(String json) throws Exception {
        mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json").content(json))
                .andExpect(status().isBadRequest());
        assertEquals(4, cupos()); assertEquals(0, reservas.count());
    }

    @Test
    void maneja404Y409SinModificarDisponibilidad() throws Exception {
        mvc.perform(get("/api/reservas/999999").header("Authorization", cliente)).andExpect(status().isNotFound());
        mvc.perform(get("/api/reservas/invalido").header("Authorization", cliente)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json")
                .content(solicitud(1).replace("\"salidaId\":" + salidaId, "\"salidaId\":999999"))).andExpect(status().isNotFound());
        mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json").content(solicitud(5)))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json")
                .content(solicitud(1).replace("}", ",\"precioEsperado\":1}"))).andExpect(status().isConflict());
        assertEquals(4, cupos()); assertEquals(0, reservas.count());
    }

    @Test
    void rechazaSalidasCerradasPasadasOTourInactivo() throws Exception {
        for (String estado : List.of("CANCELADA", "EN_CURSO", "COMPLETADA")) {
            jdbc.update("update salidas_programadas set estado = ? where id = ?", estado, salidaId);
            mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json").content(solicitud(1)))
                    .andExpect(status().isConflict());
        }
        jdbc.update("update salidas_programadas set estado = 'PROGRAMADA' where id = ?", salidaId);
        jdbc.update("update tours set activo = false where id = ?", tourId);
        mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json").content(solicitud(1)))
                .andExpect(status().isConflict());
        jdbc.update("update tours set activo = true where id = ?", tourId);
        Long id = crear(1);
        jdbc.update("update salidas_programadas set fecha = ? where id = ?", LocalDate.now().minusDays(1), salidaId);
        mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json").content(solicitud(1)))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/reservas/{id}/cancelar", id).header("Authorization", cliente)).andExpect(status().isConflict());
        mvc.perform(post("/api/reservas/{id}/confirmar", id).header("Authorization", operador)).andExpect(status().isConflict());
        assertEquals(3, cupos());
    }

    @Test
    void noPermiteSobrescribirCuposNiBorrarSalidaConHistorial() throws Exception {
        crear(1);
        var salida = salidas.findById(salidaId).orElseThrow();
        String datos = """
                {"fecha":"%s","horaSalida":"12:00:00","cuposDisponibles":4,
                "estado":"PROGRAMADA","tourId":%d,"embarcacionId":%d}
                """.formatted(salida.getFecha(), tourId, salida.getEmbarcacion().getId());
        mvc.perform(put("/api/salidas/{id}", salidaId).header("Authorization", operador)
                .contentType("application/json").content(datos)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/salidas/{id}", salidaId).header("Authorization", admin)).andExpect(status().isConflict());
        assertEquals(3, cupos());
    }

    @Test
    void reservasConcurrentesNoSobrevenden() throws Exception {
        var resultados = paralelo(() -> mvc.perform(post("/api/reservas").header("Authorization", cliente)
                .contentType("application/json").content(solicitud(3))).andReturn().getResponse().getStatus());
        assertEquals(List.of(201, 409), resultados.stream().sorted().toList());
        assertEquals(1, reservas.count()); assertEquals(1, cupos());
    }

    @Test
    void cancelacionesConcurrentesReintegranUnaSolaVez() throws Exception {
        Long id = crear(3);
        var resultados = paralelo(() -> mvc.perform(post("/api/reservas/{id}/cancelar", id).header("Authorization", cliente))
                .andReturn().getResponse().getStatus());
        assertEquals(List.of(200, 200), resultados); assertEquals(4, cupos());
    }

    private List<Integer> paralelo(Callable<Integer> tarea) throws Exception {
        var inicio = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<Integer> sincronizada = () -> { inicio.await(); return tarea.call(); };
            var a = executor.submit(sincronizada); var b = executor.submit(sincronizada);
            inicio.countDown();
            return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS));
        }
    }

    @Test
    void tarifasMixtasPersistenYSeUsanEnPagoYCancelacion() throws Exception {
        var fecha = salidas.findById(salidaId).orElseThrow().getFecha();
        String json = "{\"salidaId\":" + salidaId + ",\"ninos\":1,\"adultos\":1,\"adultosMayores\":1,\"precioEsperado\":200.63}";
        mvc.perform(get("/api/reservas/tarifas").header("Authorization", cliente))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].porcentajeDescuento").value(30));
        var resultado = mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json").content(json))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.precioTotal").value(200.63))
                .andExpect(jsonPath("$.ninos").value(1))
                .andExpect(jsonPath("$.adultos").value(1))
                .andExpect(jsonPath("$.adultosMayores").value(1))
                .andExpect(jsonPath("$.totalPasajeros").value(3)).andReturn();
        long id = mapper.readTree(resultado.getResponse().getContentAsString()).get("id").asLong();
        assertEquals(1, cupos());
        jdbc.update("update tours set precio_base = 100 where id = ?", tourId);
        String yape = "{\"metodo\":\"YAPE\",\"yape\":{\"celular\":\"987654321\",\"codigoAprobacion\":\"123457\"}}";
        mvc.perform(post("/api/reservas/{id}/pagos", id).header("Authorization", cliente).contentType("application/json").content(yape))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estadoPago").value("RECHAZADO"))
                .andExpect(jsonPath("$.monto").value(200.63));
        assertEquals(1, cupos());
        mvc.perform(post("/api/reservas/{id}/pagos", id).header("Authorization", cliente).contentType("application/json").content(yape.replace("123457", "123456")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estadoReserva").value("CONFIRMADA"))
                .andExpect(jsonPath("$.monto").value(200.63));
        mvc.perform(post("/api/reservas/{id}/cancelar", id).header("Authorization", cliente))
                .andExpect(status().isOk()).andExpect(jsonPath("$.precioTotal").value(200.63));
        assertEquals(4, cupos());
        mvc.perform(get("/api/reservas/{id}", id).header("Authorization", cliente))
                .andExpect(status().isOk()).andExpect(jsonPath("$.precioTotal").value(200.63))
                .andExpect(jsonPath("$.adultos").value(1));
    }

    @Test
    void rechazaCantidadesInvalidasSinConsumirCupos() throws Exception {
        for (String json : List.of(
                "{\"salidaId\":" + salidaId + ",\"pasajeros\":1}",
                solicitud(0), solicitud(-1), solicitud(101),
                solicitud(1).replace("\"adultos\":1", "\"adultos\":1.5"),
                solicitud(1).replace("\"ninos\":0", "\"ninos\":-1"),
                solicitud(1).replace("\"adultosMayores\":0", "\"adultosMayores\":null"))) {
            mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json").content(json))
                    .andExpect(status().isBadRequest());
        }
        assertEquals(4, cupos());
        assertEquals(0, reservas.count());
        mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json")
                .content(solicitud(2).replace("}", ",\"precioEsperado\":80.25}")))
                .andExpect(status().isConflict());
        assertEquals(4, cupos());
    }

    @Test
    void impideDuplicadosActivosPeroPermiteNuevaReservaTrasCancelar() throws Exception {
        Long id = crear(1);
        mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json")
                .content(solicitud(1))).andExpect(status().isConflict());
        assertEquals(3, cupos());
        mvc.perform(post("/api/reservas/{id}/cancelar", id).header("Authorization", cliente)).andExpect(status().isOk());
        crear(1); assertEquals(3, cupos());
    }

    @Test
    void cierreDeNuevasReservasIncluyeLimiteExactoDeDosHoras() throws Exception {
        var zona = ZoneId.of("America/Lima");
        var ahora = LocalDateTime.now(zona).withNano(0);
        Clock fijo = Clock.fixed(ahora.atZone(zona).toInstant(), zona);
        try (var reloj = org.mockito.Mockito.mockStatic(Clock.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            reloj.when(() -> Clock.system(zona)).thenReturn(fijo);
            jdbc.update("update salidas_programadas set fecha = ?, hora_salida = ? where id = ?",
                    ahora.plusHours(2).toLocalDate(), ahora.plusHours(2).toLocalTime(), salidaId);
            mvc.perform(post("/api/reservas").header("Authorization", cliente).contentType("application/json")
                    .content(solicitud(1))).andExpect(status().isConflict());
            assertEquals(4, cupos());
        }
    }

    @Test
    void bloqueo24hNoAfectaAdministradorYExcepcionSoloHabilitaCancelar() throws Exception {
        Long id = crear(1); var nuevo = LocalDateTime.now(ZoneId.of("America/Lima")).plusHours(3);
        jdbc.update("update salidas_programadas set fecha = ?, hora_salida = ? where id = ?", nuevo.toLocalDate(), nuevo.toLocalTime(), salidaId);
        mvc.perform(post("/api/reservas/{id}/cancelar", id).header("Authorization", cliente)).andExpect(status().isConflict());
        mvc.perform(get("/api/reservas/{id}", id).header("Authorization", admin)).andExpect(jsonPath("$.puedeCancelar").value(true));
        jdbc.update("update reservas set cancelacion_excepcional_hasta = ? where id = ?", nuevo.minusHours(2), id);
        mvc.perform(get("/api/reservas/{id}", id).header("Authorization", cliente)).andExpect(jsonPath("$.puedeCancelar").value(true))
                .andExpect(jsonPath("$.puedeModificar").value(false));
        mvc.perform(post("/api/reservas/{id}/cancelar", id).header("Authorization", cliente)).andExpect(status().isOk());
        assertEquals(4, cupos());
    }

    @Test
    void modificacionRecalculaTarifasYConservaHistorialSinSobrevender() throws Exception {
        Long id = crear(1); jdbc.update("update tours set precio_base = 100 where id = ?", tourId);
        String cambio = "{\"ninos\":1,\"adultos\":1,\"adultosMayores\":1,\"adicionalesIds\":[],\"precioEsperado\":250.00,\"revisionEsperada\":0}";
        mvc.perform(put("/api/reservas/{id}", id).header("Authorization", cliente).contentType("application/json").content(cambio))
                .andExpect(status().isOk()).andExpect(jsonPath("$.precioTotal").value(250))
                .andExpect(jsonPath("$.revision").value(1)).andExpect(jsonPath("$.historialEconomico.length()").value(1));
        assertEquals(1, cupos());
        mvc.perform(put("/api/reservas/{id}", id).header("Authorization", cliente).contentType("application/json").content(cambio))
                .andExpect(status().isConflict());
        assertEquals(1, cupos());
    }

    @Test
    void dosClientesCompitenPorElUltimoCupoSinSobreventa() throws Exception {
        jdbc.update("update embarcaciones set capacidad = 1");
        jdbc.update("update salidas_programadas set cupos_disponibles = 1 where id = ?", salidaId);
        var inicio = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { inicio.await(); return mvc.perform(post("/api/reservas").header("Authorization", cliente)
                    .contentType("application/json").content(solicitud(1))).andReturn().getResponse().getStatus(); });
            var b = executor.submit(() -> { inicio.await(); return mvc.perform(post("/api/reservas").header("Authorization", otro)
                    .contentType("application/json").content(solicitud(1))).andReturn().getResponse().getStatus(); });
            inicio.countDown(); assertEquals(List.of(201, 409), java.util.stream.Stream.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS)).sorted().toList());
            assertEquals(0, cupos()); assertEquals(1, reservas.count());
        }
    }

    @Test
    void reservaPagadaRegistraCobroYReembolsoSimuladosSinCrearPagosReales() throws Exception {
        Long id = crear(1);
        mvc.perform(post("/api/reservas/{id}/pagos", id).header("Authorization", cliente).contentType("application/json")
                .content("{\"metodo\":\"YAPE\",\"yape\":{\"celular\":\"987654321\",\"codigoAprobacion\":\"123456\"}}"))
                .andExpect(status().isOk());
        jdbc.update("update tours set precio_base = 100 where id = ?", tourId);
        mvc.perform(put("/api/reservas/{id}", id).header("Authorization", cliente).contentType("application/json")
                .content("{\"ninos\":0,\"adultos\":2,\"adultosMayores\":0,\"adicionalesIds\":[],\"precioEsperado\":200,\"revisionEsperada\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.historialEconomico[0].tipo").value("COBRO_ADICIONAL_SIMULADO"))
                .andExpect(jsonPath("$.historialEconomico[0].ajusteSimulado").value(119.75));
        mvc.perform(put("/api/reservas/{id}", id).header("Authorization", cliente).contentType("application/json")
                .content("{\"ninos\":1,\"adultos\":0,\"adultosMayores\":0,\"adicionalesIds\":[],\"precioEsperado\":70,\"revisionEsperada\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.historialEconomico[1].tipo").value("REEMBOLSO_SIMULADO"))
                .andExpect(jsonPath("$.historialEconomico[1].ajusteSimulado").value(-130));
        assertEquals(1, pagos.count()); assertEquals(3, cupos());
    }

    @Test
    void planDeDosExperienciasConservaIdempotenciaTrasModificarUnaReserva() throws Exception {
        var original = salidas.findById(salidaId).orElseThrow();
        var segunda = new SalidaProgramada(); segunda.setTour(original.getTour()); segunda.setEmbarcacion(original.getEmbarcacion());
        segunda.setOperador(original.getOperador()); segunda.setFecha(original.getFecha()); segunda.setHoraSalida(LocalTime.of(14, 0));
        segunda.setCuposDisponibles(4); segunda.setEstado(EstadoSalida.PROGRAMADA); segunda = salidas.saveAndFlush(segunda);
        var usuario = usuarios.findByCorreo("cliente@example.com").orElseThrow();
        var actor = new com.seatour.seatour.dto.LoginRespuesta(usuario.getId(), "Cliente", usuario.getCorreo(), "CLIENTE");
        var seleccion = new com.seatour.seatour.dto.PlanReservaSeleccion(new com.seatour.seatour.dto.ComposicionPasajeros(0, 1, 0),
                List.of(new com.seatour.seatour.dto.PlanReservaSeleccion.Item(salidaId, new BigDecimal("80.25")),
                        new com.seatour.seatour.dto.PlanReservaSeleccion.Item(segunda.getId(), new BigDecimal("80.25"))), List.of(), BigDecimal.ZERO);
        var pago = new com.seatour.seatour.dto.PagoSolicitud(MetodoPago.YAPE, null,
                new com.seatour.seatour.dto.PagoSolicitud.Yape("987654321", "123456"));
        var solicitud = new com.seatour.seatour.dto.PlanReservaPagoSolicitud(UUID.randomUUID(), seleccion, pago);
        var resultado = planes.pagar(solicitud, actor); assertEquals(2, resultado.reservas().size());
        long id = resultado.reservas().get(0).id();
        mvc.perform(put("/api/reservas/{id}", id).header("Authorization", cliente).contentType("application/json")
                .content("{\"ninos\":0,\"adultos\":2,\"adultosMayores\":0,\"adicionalesIds\":[],\"precioEsperado\":160.50,\"revisionEsperada\":0}"))
                .andExpect(status().isOk());
        var reintento = planes.pagar(solicitud, actor);
        assertEquals(2, reintento.reservas().size()); assertEquals(2, reservas.count()); assertEquals(2, pagos.count());
    }
}
