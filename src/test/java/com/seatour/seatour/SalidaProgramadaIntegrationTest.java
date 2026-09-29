package com.seatour.seatour;

import com.seatour.seatour.model.*;
import com.seatour.seatour.repository.*;
import com.seatour.seatour.service.InicioAutomaticoSalidas;
import com.seatour.seatour.service.SalidaProgramadaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.MockedStatic;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(locations = "classpath:application-test.properties", properties = {
        "spring.datasource.url=jdbc:h2:mem:salidas-reglas-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.open-in-view=false",
        "spring.jpa.show-sql=false"
})
class SalidaProgramadaIntegrationTest {
    private static final ZoneId LIMA = ZoneId.of("America/Lima");
    private static final LocalDate HOY = LocalDate.of(2035, 6, 10);
    private static final LocalDate FECHA = HOY.plusDays(2);
    private static final String MOTIVO = "FALLA_TECNICA";

    @Autowired SalidaProgramadaService servicio;
    @Autowired SalidaProgramadaRepository salidas;
    @Autowired ReservaRepository reservas;
    @Autowired TourRepository tours;
    @Autowired EmbarcacionRepository barcos;
    @Autowired CategoriaTourRepository categorias;
    @Autowired UsuarioRepository usuarios;
    @Autowired RolRepository roles;
    @Autowired JdbcTemplate jdbc;
    // El planificador no debe iniciar salidas mientras las pruebas controlan el reloj.
    @MockitoBean InicioAutomaticoSalidas inicioAutomatico;

    private MockedStatic<Clock> reloj;
    private Tour tour;
    private Embarcacion barco;
    private Usuario cliente;

    @BeforeEach
    void preparar() {
        Clock fijo = Clock.fixed(HOY.atTime(12, 0).atZone(LIMA).toInstant(), LIMA);
        reloj = mockStatic(Clock.class, CALLS_REAL_METHODS);
        reloj.when(() -> Clock.system(LIMA)).thenReturn(fijo);
        reservas.deleteAll();
        salidas.deleteAll();
        tours.deleteAll();
        barcos.deleteAll();
        categorias.deleteAll();
        usuarios.deleteAll();

        var categoria = new CategoriaTour();
        categoria.setNombre("Mar");
        categoria.setActivo(true);
        categorias.saveAndFlush(categoria);
        tour = new Tour();
        tour.setNombre("Paseo");
        tour.setDescripcion("Paseo marino de prueba");
        tour.setDuracionMinutos(90);
        tour.setPrecioBase(BigDecimal.TEN);
        tour.setActivo(true);
        tour.setCategoriaTour(categoria);
        tour = tours.saveAndFlush(tour);
        barco = embarcacion("SAL-01", 8);
        cliente = new Usuario();
        cliente.setNombre("Cliente");
        cliente.setApellido("Prueba");
        cliente.setCorreo("salidas@example.com");
        cliente.setPassword("fixture-no-login");
        cliente.setActivo(true);
        cliente.setRol(roles.findByNombre("CLIENTE").orElseThrow());
        cliente = usuarios.saveAndFlush(cliente);
    }

    @AfterEach
    void cerrarReloj() {
        if (reloj != null) reloj.close();
    }

    // Sin @Transactional en la prueba: cada llamada usa la transacción real del servicio.
    // Las aserciones vuelven a consultar la BD para comprobar commits y rollbacks.
    @ParameterizedTest
    @CsvSource({"0,19:00", "45,06:00", "45,19:00"})
    void aceptaHorizonteInclusivoYDerivaCuposDeCapacidad(int dias, String hora) {
        var datos = datos(HOY.plusDays(dias), hora, barco);
        datos.setCuposDisponibles(99);
        var creada = servicio.crear(datos);
        var guardada = leer(creada.getId());
        assertEquals(8, guardada.getCuposDisponibles());
        assertEquals(EstadoSalida.PROGRAMADA, guardada.getEstado());
        assertEquals(HOY.plusDays(dias), guardada.getFecha());
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 46})
    void rechazaFechasFueraDelHorizonte(int dias) {
        rechaza(400, () -> servicio.crear(datos(HOY.plusDays(dias), "12:00", barco)));
        assertEquals(0, salidas.count());
    }

    @ParameterizedTest
    @ValueSource(strings = {"05:59:59", "19:00:01"})
    void rechazaHorasFueraDeVentana(String hora) {
        rechaza(400, () -> servicio.crear(datos(FECHA, hora, barco)));
        assertEquals(0, salidas.count());
    }

    @ParameterizedTest
    @ValueSource(strings = {"11:59:59", "12:00:00"})
    void exigeInicioEstrictamenteFuturo(String hora) {
        rechaza(400, () -> servicio.crear(datos(HOY, hora, barco)));
        assertEquals(0, salidas.count());
    }

    @ParameterizedTest
    @ValueSource(strings = {"09:30:01", "11:29:59", "11:30:00", "12:29:59"})
    void rechazaSolapamientoIncluidoBufferEnAmbosSentidos(String hora) {
        crear(FECHA, "12:00", barco);
        rechaza(409, () -> servicio.crear(datos(FECHA, hora, barco)));
        assertEquals(1, salidas.count());
    }

    @ParameterizedTest
    @ValueSource(strings = {"09:30", "14:30"})
    void permiteContactoExactoConLimiteDelBuffer(String hora) {
        crear(FECHA, "12:00", barco);
        crear(FECHA, hora, barco);
        assertEquals(2, salidas.count());
    }

    @Test
    void bufferPosteriorAlFinDelTourTambienBloquea() {
        crear(FECHA, "12:00", barco); // Termina 13:30; el buffer termina 14:30.
        rechaza(409, () -> servicio.crear(datos(FECHA, "14:29:59", barco)));
    }

    @Test
    void solapamientoConsideraSalidasDelDiaAnterior() {
        tour.setDuracionMinutos(660);
        tours.saveAndFlush(tour);
        crear(FECHA, "19:00", barco); // Fin al día siguiente 06:00 + buffer hasta 07:00.
        rechaza(409, () -> servicio.crear(datos(FECHA.plusDays(1), "06:59:59", barco)));
        crear(FECHA.plusDays(1), "07:00", barco);
        assertEquals(2, salidas.count());
    }

    @Test
    void otraEmbarcacionYSalidasCanceladasNoBloqueanHorario() {
        var original = crear(FECHA, "12:00", barco);
        crear(FECHA, "12:00", embarcacion("SAL-02", 4));
        servicio.cambiarEstado(original.getId(), EstadoSalida.CANCELADA);
        crear(FECHA, "12:00", barco);
        assertEquals(3, salidas.count());
    }

    @Test
    void reprogramaSinReservasHaciaAtrasYMasDe72HorasSinConsumirCambio() {
        var salida = crear(FECHA, "12:00", barco);
        servicio.actualizar(salida.getId(), datos(FECHA.minusDays(1), "12:00", barco));
        var propuesta = datos(FECHA.plusDays(5), "12:00", barco);
        propuesta.setCuposDisponibles(1);
        servicio.actualizar(salida.getId(), propuesta);
        var guardada = leer(salida.getId());
        assertEquals(FECHA.plusDays(5), guardada.getFecha());
        assertEquals(8, guardada.getCuposDisponibles());
        assertFalse(guardada.isCambioOperativoConsumido());
        assertNull(guardada.getMotivoReprogramacion());
    }

    @ParameterizedTest
    @CsvSource({"46,12:00", "3,05:59:59", "3,19:00:01"})
    void reprogramacionTambienRespetaHorizonteYVentana(int dias, String hora) {
        var salida = crear(FECHA, "12:00", barco);
        rechaza(400, () -> servicio.actualizar(salida.getId(), datos(HOY.plusDays(dias), hora, barco)));
        assertEquals(FECHA, leer(salida.getId()).getFecha());
        assertEquals(LocalTime.NOON, leer(salida.getId()).getHoraSalida());
    }

    @ParameterizedTest
    @EnumSource(value = EstadoReserva.class, names = {"PENDIENTE", "CONFIRMADA"})
    void reprogramaConReservasHasta72HorasYConservaTrazabilidad(EstadoReserva estado) {
        var salida = crear(FECHA, "12:00", barco);
        reservar(salida, 3, estado);
        var propuesta = reprogramacion(FECHA.plusDays(3), "12:00");
        propuesta.setCuposDisponibles(8);
        servicio.actualizar(salida.getId(), propuesta);
        var guardada = leer(salida.getId());
        assertEquals(FECHA.plusDays(3), guardada.getFecha());
        assertEquals(FECHA, guardada.getFechaOriginal());
        assertEquals(FECHA, guardada.getFechaAnterior());
        assertEquals(LocalTime.NOON, guardada.getHoraOriginal());
        assertEquals(LocalTime.NOON, guardada.getHoraAnterior());
        assertEquals(MOTIVO, guardada.getMotivoReprogramacion());
        assertEquals(5, guardada.getCuposDisponibles());
        assertTrue(guardada.isCambioOperativoConsumido());
    }

    @ParameterizedTest
    @CsvSource({"1,12:00", "2,12:00", "5,12:00:01"})
    void conReservasNoAdmiteRetrocesoMismoHorarioNiMasDe72Horas(int dias, String hora) {
        var salida = crear(FECHA, "12:00", barco);
        reservar(salida, 2, EstadoReserva.PENDIENTE);
        rechaza(409, () -> servicio.actualizar(salida.getId(), reprogramacion(HOY.plusDays(dias), hora)));
        assertEquals(FECHA, leer(salida.getId()).getFecha());
        assertFalse(leer(salida.getId()).isCambioOperativoConsumido());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"INVALIDO"})
    void reprogramacionConReservasExigeMotivoValido(String motivo) {
        var salida = crear(FECHA, "12:00", barco);
        reservar(salida, 2, EstadoReserva.PENDIENTE);
        var propuesta = reprogramacion(FECHA.plusDays(1), "12:00");
        propuesta.setMotivoReprogramacion(motivo);
        rechaza(400, () -> servicio.actualizar(salida.getId(), propuesta));
        assertEquals(FECHA, leer(salida.getId()).getFecha());
    }

    @Test
    void reprogramacionConHistorialCanceladoConservaRestriccionesHistoricas() {
        var salida = crear(FECHA, "12:00", barco);
        reservar(salida, 2, EstadoReserva.CANCELADA);
        // La regla histórica de reprogramación sigue vigente; el cambio reciente solo afecta cancelar.
        rechaza(400, () -> servicio.actualizar(salida.getId(), datos(FECHA.plusDays(1), "12:00", barco)));
        servicio.actualizar(salida.getId(), reprogramacion(FECHA.plusDays(1), "12:00"));
        servicio.actualizar(salida.getId(), reprogramacion(FECHA.plusDays(2), "12:00"));
        assertFalse(leer(salida.getId()).isCambioOperativoConsumido());
        assertEquals(8, leer(salida.getId()).getCuposDisponibles());
        rechaza(409, () -> servicio.actualizar(salida.getId(), reprogramacion(FECHA.plusDays(3), "12:00:01")));
        assertEquals(FECHA.plusDays(2), leer(salida.getId()).getFecha());
    }

    @Test
    void reprogramarConsumeElCambioYBloqueaOtraReprogramacionOCambioDeBarco() {
        var salida = crear(FECHA, "12:00", barco);
        reservar(salida, 2, EstadoReserva.CONFIRMADA);
        servicio.actualizar(salida.getId(), reprogramacion(FECHA.plusDays(1), "12:00"));
        var nuevo = embarcacion("SAL-02", 8);
        rechaza(409, () -> servicio.actualizar(salida.getId(), reprogramacion(FECHA.plusDays(2), "12:00")));
        rechaza(409, () -> servicio.cambiarEmbarcacion(salida.getId(), nuevo.getId(), MOTIVO));
        assertEquals(FECHA.plusDays(1), leer(salida.getId()).getFecha());
        assertEquals(barco.getId(), leer(salida.getId()).getEmbarcacion().getId());
    }

    @Test
    void cambioDeBarcoConsumeElMismoLimiteOperativo() {
        var salida = crear(FECHA, "12:00", barco);
        reservar(salida, 3, EstadoReserva.PENDIENTE);
        var nuevo = embarcacion("SAL-02", 5);
        servicio.cambiarEmbarcacion(salida.getId(), nuevo.getId(), MOTIVO);
        assertEquals(2, leer(salida.getId()).getCuposDisponibles());
        assertTrue(leer(salida.getId()).isCambioOperativoConsumido());
        rechaza(409, () -> servicio.cambiarEmbarcacion(salida.getId(), barco.getId(), MOTIVO));
        var propuesta = reprogramacion(FECHA.plusDays(1), "12:00");
        propuesta.setEmbarcacion(nuevo);
        rechaza(409, () -> servicio.actualizar(salida.getId(), propuesta));
        assertEquals(nuevo.getId(), leer(salida.getId()).getEmbarcacion().getId());
        assertEquals(FECHA, leer(salida.getId()).getFecha());
    }

    @Test
    void capacidadInsuficienteNoConsumeCambioYCapacidadExactaDejaCeroCupos() {
        var salida = crear(FECHA, "12:00", barco);
        reservar(salida, 3, EstadoReserva.PENDIENTE);
        var pequeno = embarcacion("SAL-02", 2);
        rechaza(409, () -> servicio.cambiarEmbarcacion(salida.getId(), pequeno.getId(), MOTIVO));
        assertFalse(leer(salida.getId()).isCambioOperativoConsumido());
        assertEquals(5, leer(salida.getId()).getCuposDisponibles());
        assertEquals(barco.getId(), leer(salida.getId()).getEmbarcacion().getId());
        var exacto = embarcacion("SAL-03", 3);
        servicio.cambiarEmbarcacion(salida.getId(), exacto.getId(), MOTIVO);
        assertEquals(0, leer(salida.getId()).getCuposDisponibles());
        assertEquals(1, jdbc.queryForObject("select count(*) from salida_cambios_embarcacion where salida_id = ?",
                Integer.class, salida.getId()));
    }

    @Test
    void cambiosDeBarcoSinActivasNoConsumenLimiteNiDescuentanHistorial() {
        var salida = crear(FECHA, "12:00", barco);
        reservar(salida, 8, EstadoReserva.CANCELADA);
        var nuevo = embarcacion("SAL-02", 2);
        servicio.cambiarEmbarcacion(salida.getId(), nuevo.getId(), MOTIVO);
        assertEquals(2, leer(salida.getId()).getCuposDisponibles());
        servicio.cambiarEmbarcacion(salida.getId(), barco.getId(), MOTIVO);
        assertEquals(8, leer(salida.getId()).getCuposDisponibles());
        assertFalse(leer(salida.getId()).isCambioOperativoConsumido());
    }

    @Test
    void actualizarNoPermiteCambiarBarcoConActivasNiCambiarTourConHistorial() {
        var salida = crear(FECHA, "12:00", barco);
        reservar(salida, 1, EstadoReserva.PENDIENTE);
        var propuesta = reprogramacion(FECHA.plusDays(1), "12:00");
        propuesta.setEmbarcacion(embarcacion("SAL-02", 8));
        rechaza(409, () -> servicio.actualizar(salida.getId(), propuesta));
        propuesta.setEmbarcacion(barco);
        var otroTour = new Tour();
        otroTour.setId(tour.getId() + 1000);
        propuesta.setTour(otroTour);
        rechaza(409, () -> servicio.actualizar(salida.getId(), propuesta));
        assertEquals(barco.getId(), leer(salida.getId()).getEmbarcacion().getId());
    }

    @Test
    void solapamientoAlReprogramarRevierteTrazabilidadYCambioConsumido() {
        var salida = crear(FECHA, "12:00", barco);
        reservar(salida, 1, EstadoReserva.PENDIENTE);
        crear(FECHA.plusDays(1), "12:00", barco);
        rechaza(409, () -> servicio.actualizar(salida.getId(), reprogramacion(FECHA.plusDays(1), "12:00")));
        var guardada = leer(salida.getId());
        assertEquals(FECHA, guardada.getFecha());
        assertNull(guardada.getFechaOriginal());
        assertFalse(guardada.isCambioOperativoConsumido());
    }

    @Test
    void cambioDeBarcoRechazaSolapamiento() {
        var salida = crear(FECHA, "12:00", barco);
        var nuevo = embarcacion("SAL-02", 8);
        crear(FECHA, "12:00", nuevo);
        rechaza(409, () -> servicio.cambiarEmbarcacion(salida.getId(), nuevo.getId(), MOTIVO));
        assertEquals(barco.getId(), leer(salida.getId()).getEmbarcacion().getId());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"FUERZA_MAYOR", "INVALIDO"})
    void cambioDeBarcoExigeMotivoEspecifico(String motivo) {
        var salida = crear(FECHA, "12:00", barco);
        var nuevo = embarcacion("SAL-02", 8);
        rechaza(400, () -> servicio.cambiarEmbarcacion(salida.getId(), nuevo.getId(), motivo));
        assertEquals(barco.getId(), leer(salida.getId()).getEmbarcacion().getId());
    }

    @ParameterizedTest
    @EnumSource(value = EstadoReserva.class, names = {"PENDIENTE", "CONFIRMADA"})
    void cancelarConActivasExigeMotivoSinModificarReservas(EstadoReserva estado) {
        var salida = crear(FECHA, "12:00", barco);
        var reserva = reservar(salida, 3, estado);
        rechaza(400, () -> servicio.cambiarEstado(salida.getId(), EstadoSalida.CANCELADA));
        assertEquals(EstadoSalida.PROGRAMADA, leer(salida.getId()).getEstado());
        assertEquals(5, leer(salida.getId()).getCuposDisponibles());
        assertEquals(estado, reservas.findById(reserva.getId()).orElseThrow().getEstado());
        assertNull(leer(salida.getId()).getFechaCancelacion());
    }

    @Test
    void cancelarConMotivoCancelaActivasYReintegraCuposSoloUnaVez() {
        var salida = crear(FECHA, "12:00", barco);
        var pendiente = reservar(salida, 2, EstadoReserva.PENDIENTE);
        var confirmada = reservar(salida, 3, EstadoReserva.CONFIRMADA);
        var historica = reservar(salida, 7, EstadoReserva.CANCELADA);
        var fechaHistorica = reservas.findById(historica.getId()).orElseThrow().getCanceladaEn();
        servicio.cambiarEstado(salida.getId(), EstadoSalida.CANCELADA, MOTIVO);
        var guardada = leer(salida.getId());
        assertEquals(EstadoSalida.CANCELADA, guardada.getEstado());
        assertEquals(MOTIVO, guardada.getMotivoCancelacion());
        assertEquals(HOY.atTime(12, 0), guardada.getFechaCancelacion());
        assertEquals(8, guardada.getCuposDisponibles());
        for (var id : new Long[]{pendiente.getId(), confirmada.getId(), historica.getId()}) {
            var reserva = reservas.findById(id).orElseThrow();
            assertEquals(EstadoReserva.CANCELADA, reserva.getEstado());
            assertNotNull(reserva.getCanceladaEn());
        }
        assertEquals(fechaHistorica, reservas.findById(historica.getId()).orElseThrow().getCanceladaEn());
        rechaza(409, () -> servicio.cambiarEstado(salida.getId(), EstadoSalida.CANCELADA, MOTIVO));
        assertEquals(8, leer(salida.getId()).getCuposDisponibles());
    }

    @Test
    void cancelarConSoloHistorialNoExigeMotivoYNoReintegraDeNuevo() {
        var salida = crear(FECHA, "12:00", barco);
        var historica = reservar(salida, 3, EstadoReserva.CANCELADA);
        var fecha = reservas.findById(historica.getId()).orElseThrow().getCanceladaEn();
        assertTrue(servicio.tieneReservas(salida.getId()));
        assertEquals(0, servicio.pasajerosReservados(salida.getId()));
        servicio.cambiarEstado(salida.getId(), EstadoSalida.CANCELADA);
        var guardada = leer(salida.getId());
        assertEquals(EstadoSalida.CANCELADA, guardada.getEstado());
        assertNull(guardada.getMotivoCancelacion());
        assertNotNull(guardada.getFechaCancelacion());
        assertEquals(8, guardada.getCuposDisponibles());
        assertEquals(fecha, reservas.findById(historica.getId()).orElseThrow().getCanceladaEn());
    }

    @Test
    void cancelacionRevierteReservasYaProcesadasSiOtraReservaEsInvalida() {
        var salida = crear(FECHA, "12:00", barco);
        var primera = reservar(salida, 2, EstadoReserva.PENDIENTE);
        var segunda = reservar(salida, 1, EstadoReserva.CONFIRMADA);
        // Simula datos históricos corruptos: falla dentro del bucle tras cancelar la primera.
        jdbc.update("update reservas set pasajeros = 0 where id = ?", segunda.getId());
        rechaza(409, () -> servicio.cambiarEstado(salida.getId(), EstadoSalida.CANCELADA, MOTIVO));
        assertEquals(EstadoReserva.PENDIENTE, reservas.findById(primera.getId()).orElseThrow().getEstado());
        assertNull(reservas.findById(primera.getId()).orElseThrow().getCanceladaEn());
        assertEquals(EstadoReserva.CONFIRMADA, reservas.findById(segunda.getId()).orElseThrow().getEstado());
        var guardada = leer(salida.getId());
        assertEquals(EstadoSalida.PROGRAMADA, guardada.getEstado());
        assertEquals(5, guardada.getCuposDisponibles());
        assertNull(guardada.getMotivoCancelacion());
        assertNull(guardada.getFechaCancelacion());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "INVALIDO"})
    void motivoCancelacionInformadoDebeSerValidoAunqueNoHayaReservas(String motivo) {
        var salida = crear(FECHA, "12:00", barco);
        rechaza(400, () -> servicio.cambiarEstado(salida.getId(), EstadoSalida.CANCELADA, motivo));
        assertEquals(EstadoSalida.PROGRAMADA, leer(salida.getId()).getEstado());
    }

    @ParameterizedTest
    @EnumSource(EstadoReserva.class)
    void noEliminaSalidaConCualquierReservaHistorica(EstadoReserva estado) {
        var salida = crear(FECHA, "12:00", barco);
        var reserva = reservar(salida, 2, estado);
        rechaza(409, () -> servicio.eliminar(salida.getId()));
        assertTrue(salidas.existsById(salida.getId()));
        assertTrue(reservas.existsById(reserva.getId()));
    }

    @Test
    void eliminaProgramadaFuturaSinHistorial() {
        var salida = crear(FECHA, "12:00", barco);
        servicio.eliminar(salida.getId());
        assertFalse(salidas.existsById(salida.getId()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"11:59:59", "12:00:00"})
    void noEliminaSalidaQueYaAlcanzoSuHora(String hora) {
        var salida = persistir(HOY, hora, EstadoSalida.PROGRAMADA);
        rechaza(409, () -> servicio.eliminar(salida.getId()));
        assertTrue(salidas.existsById(salida.getId()));
    }

    @ParameterizedTest
    @EnumSource(value = EstadoSalida.class, names = {"EN_CURSO", "COMPLETADA", "CANCELADA"})
    void estadosNoProgramadosNoPermitenEliminarReprogramarNiCambiarBarco(EstadoSalida estado) {
        var salida = persistir(FECHA, "12:00", estado);
        var nuevo = embarcacion("SAL-02", 8);
        rechaza(409, () -> servicio.eliminar(salida.getId()));
        rechaza(409, () -> servicio.actualizar(salida.getId(), reprogramacion(FECHA.plusDays(1), "12:00")));
        rechaza(409, () -> servicio.cambiarEmbarcacion(salida.getId(), nuevo.getId(), MOTIVO));
        assertEquals(estado, leer(salida.getId()).getEstado());
    }

    @ParameterizedTest
    @CsvSource({"PROGRAMADA,PROGRAMADA", "PROGRAMADA,COMPLETADA", "EN_CURSO,PROGRAMADA",
            "EN_CURSO,EN_CURSO", "EN_CURSO,CANCELADA", "COMPLETADA,PROGRAMADA",
            "COMPLETADA,EN_CURSO", "COMPLETADA,COMPLETADA", "COMPLETADA,CANCELADA",
            "CANCELADA,PROGRAMADA", "CANCELADA,EN_CURSO", "CANCELADA,COMPLETADA", "CANCELADA,CANCELADA"})
    void rechazaTransicionesNoPermitidas(EstadoSalida origen, EstadoSalida destino) {
        var salida = persistir(HOY, "10:00", origen);
        rechaza(409, () -> servicio.cambiarEstado(salida.getId(), destino, MOTIVO));
        assertEquals(origen, leer(salida.getId()).getEstado());
    }

    @ParameterizedTest
    @CsvSource({"12:00:01,409", "12:00:00,200", "10:30:01,200", "10:30:00,409", "10:29:59,409"})
    void inicioManualSoloDesdeInicioHastaAntesDelFin(String hora, int esperado) {
        var salida = persistir(HOY, hora, EstadoSalida.PROGRAMADA);
        if (esperado == 200) {
            servicio.cambiarEstado(salida.getId(), EstadoSalida.EN_CURSO);
            assertEquals(EstadoSalida.EN_CURSO, leer(salida.getId()).getEstado());
        } else {
            rechaza(esperado, () -> servicio.cambiarEstado(salida.getId(), EstadoSalida.EN_CURSO));
            assertEquals(EstadoSalida.PROGRAMADA, leer(salida.getId()).getEstado());
        }
    }

    @ParameterizedTest
    @CsvSource({"10:30:01,409", "10:30:00,200", "10:29:59,200"})
    void completarSoloDesdeFinPrevistoSinEsperarBuffer(String hora, int esperado) {
        var salida = persistir(HOY, hora, EstadoSalida.EN_CURSO);
        if (esperado == 200) {
            servicio.cambiarEstado(salida.getId(), EstadoSalida.COMPLETADA);
            assertEquals(EstadoSalida.COMPLETADA, leer(salida.getId()).getEstado());
        } else {
            rechaza(esperado, () -> servicio.cambiarEstado(salida.getId(), EstadoSalida.COMPLETADA));
            assertEquals(EstadoSalida.EN_CURSO, leer(salida.getId()).getEstado());
        }
    }

    @Test
    void inicioAutomaticoAceptaAtrasadaPeroNoFuturaNiCerrada() {
        var atrasada = persistir(HOY, "08:00", EstadoSalida.PROGRAMADA);
        servicio.iniciarAutomaticamente(atrasada.getId());
        assertEquals(EstadoSalida.EN_CURSO, leer(atrasada.getId()).getEstado());
        var futura = persistir(FECHA, "12:00", EstadoSalida.PROGRAMADA);
        servicio.iniciarAutomaticamente(futura.getId());
        assertEquals(EstadoSalida.PROGRAMADA, leer(futura.getId()).getEstado());
        var cerrada = persistir(HOY.minusDays(1), "12:00", EstadoSalida.CANCELADA);
        servicio.iniciarAutomaticamente(cerrada.getId());
        assertEquals(EstadoSalida.CANCELADA, leer(cerrada.getId()).getEstado());
    }

    @Test
    void noIniciaSiBarcoSigueEnCursoAunqueIntervalosNoSeSolapen() {
        persistir(HOY, "06:00", EstadoSalida.EN_CURSO);
        var salida = persistir(HOY, "12:00", EstadoSalida.PROGRAMADA);
        rechaza(409, () -> servicio.cambiarEstado(salida.getId(), EstadoSalida.EN_CURSO));
        assertEquals(EstadoSalida.PROGRAMADA, leer(salida.getId()).getEstado());
    }

    private Embarcacion embarcacion(String matricula, int capacidad) {
        var nueva = new Embarcacion();
        nueva.setNombre(matricula);
        nueva.setMatricula(matricula);
        nueva.setCapacidad(capacidad);
        nueva.setActivo(true);
        return barcos.saveAndFlush(nueva);
    }

    private SalidaProgramada datos(LocalDate fecha, String hora, Embarcacion embarcacion) {
        var salida = new SalidaProgramada();
        salida.setTour(tour);
        salida.setEmbarcacion(embarcacion);
        salida.setFecha(fecha);
        salida.setHoraSalida(LocalTime.parse(hora));
        return salida;
    }

    private SalidaProgramada crear(LocalDate fecha, String hora, Embarcacion embarcacion) {
        return servicio.crear(datos(fecha, hora, embarcacion));
    }

    private SalidaProgramada reprogramacion(LocalDate fecha, String hora) {
        var salida = datos(fecha, hora, barco);
        salida.setMotivoReprogramacion(MOTIVO);
        return salida;
    }

    private SalidaProgramada persistir(LocalDate fecha, String hora, EstadoSalida estado) {
        var salida = datos(fecha, hora, barco);
        salida.setEstado(estado);
        salida.setCuposDisponibles(barco.getCapacidad());
        return salidas.saveAndFlush(salida);
    }

    private Reserva reservar(SalidaProgramada salida, int pasajeros, EstadoReserva estado) {
        var reserva = new Reserva(cliente, salida, pasajeros, BigDecimal.TEN);
        if (estado == EstadoReserva.CONFIRMADA) reserva.confirmar();
        if (estado == EstadoReserva.CANCELADA) reserva.cancelar();
        reserva = reservas.saveAndFlush(reserva);
        if (estado != EstadoReserva.CANCELADA) {
            jdbc.update("update salidas_programadas set cupos_disponibles = cupos_disponibles - ? where id = ?",
                    pasajeros, salida.getId());
        }
        return reserva;
    }

    private SalidaProgramada leer(Long id) {
        return salidas.findById(id).orElseThrow();
    }

    private void rechaza(int codigo, org.junit.jupiter.api.function.Executable accion) {
        var error = assertThrows(ResponseStatusException.class, accion);
        assertEquals(codigo, error.getStatusCode().value(), error.getReason());
    }
}
