package com.seatour.seatour;

import com.seatour.seatour.dto.UsuarioCreacion;
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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;
import com.seatour.seatour.security.JwtService;
import com.seatour.seatour.security.UsuarioPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:auth-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.open-in-view=false"
})
@AutoConfigureMockMvc
@org.springframework.test.context.ActiveProfiles("test")
@Import(AuthIntegrationTest.ProtectedEndpoint.class)
class AuthIntegrationTest {
    private static final String CLAVE = "Clave de prueba 123!";
    @Autowired MockMvc mvc;
    @Autowired UsuarioRepository usuarios;
    @Autowired RolRepository roles;
    @Autowired UsuarioService servicio;
    @Autowired AuthenticationManager authenticationManager;
    @Autowired JwtService jwtService;
    @Autowired ObjectMapper mapper;
    @Value("${seatour.jwt.secret}") String jwtSecret;
    @Value("${seatour.jwt.issuer}") String jwtIssuer;

    // Endpoint solo de pruebas: verifica la cadena real sin ampliar la API de produccion.
    @TestConfiguration(proxyBeanMethods = false)
    @RestController
    static class ProtectedEndpoint {
        @GetMapping("/api/test/protegido")
        Map<String, Object> protegido(Authentication authentication) {
            var usuario = (UsuarioPrincipal) authentication.getPrincipal();
            return Map.of("correo", authentication.getName(), "autoridades", authentication.getAuthorities()
                    .stream().map(a -> a.getAuthority()).toList(), "sinPassword", usuario.getPassword() == null);
        }
    }

    @BeforeEach
    void preparar() {
        usuarios.deleteAll();
        servicio.crear(new UsuarioCreacion("Ana", "Perez", "ana@example.com", CLAVE));
    }

    private String solicitud(String correo, String password) {
        return """
                {"correo":"%s","password":"%s"}
                """.formatted(correo, password);
    }

    @Test
    void loginPublicoDevuelveJwtSinPasswordNiSesion() throws Exception {
        var usuario = usuarios.findByCorreo("ana@example.com").orElseThrow();
        String hash = usuario.getPassword();
        var resultado = mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(solicitud("ANA@EXAMPLE.COM", CLAVE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", aMapWithSize(5)))
                .andExpect(jsonPath("$.id").value(usuario.getId()))
                .andExpect(jsonPath("$.nombre").value("Ana"))
                .andExpect(jsonPath("$.correo").value("ana@example.com"))
                .andExpect(jsonPath("$.rol").value("CLIENTE"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(content().string(not(containsString(CLAVE))))
                .andExpect(content().string(not(containsString(hash))))
                .andReturn();
        assertNull(resultado.getRequest().getSession(false));
        assertNull(resultado.getResponse().getCookie("JSESSIONID"));
        assertEquals(hash, usuarios.findById(usuario.getId()).orElseThrow().getPassword());
        String token = mapper.readTree(resultado.getResponse().getContentAsString()).get("token").asString();
        Jwt jwt = jwtService.validarToken(token);
        assertEquals("HS256", jwt.getHeaders().get("alg"));
        assertEquals("JWT", jwt.getHeaders().get("typ"));
        assertEquals("ana@example.com", jwtService.extraerCorreo(token));
        assertEquals("CLIENTE", jwtService.extraerRol(token));
        assertEquals(usuario.getId(), jwt.getClaims().get("userId"));
        assertEquals(jwtIssuer, jwt.getClaimAsString("iss"));
        assertEquals(3600, java.time.Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt()).toSeconds());
        assertEquals(java.util.Set.of("iss", "sub", "iat", "exp", "userId", "rol"), jwt.getClaims().keySet());
    }

    @ParameterizedTest
    @ValueSource(strings = {"incorrecto", "inexistente", "inactivo"})
    void rechazaCredencialesConRespuestaGenerica(String caso) throws Exception {
        if (caso.equals("inactivo")) {
            var usuario = usuarios.findByCorreo("ana@example.com").orElseThrow();
            usuario.setActivo(false);
            usuarios.saveAndFlush(usuario);
        }
        mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(solicitud(caso.equals("inexistente") ? "nadie@example.com" : "ana@example.com",
                                caso.equals("incorrecto") ? "incorrecta" : CLAVE)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"mensaje\":\"Credenciales invalidas\"}"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {"CLIENTE", "OPERADOR", "ADMIN"})
    void cargaAutoridadYRolSinDependerDeSesionJpa(String rol) throws Exception {
        var usuario = usuarios.findByCorreo("ana@example.com").orElseThrow();
        usuario.setRol(roles.findByNombre(rol).orElseThrow());
        usuarios.saveAndFlush(usuario);
        var autenticacion = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(" ANA@EXAMPLE.COM ", CLAVE));
        assertTrue(autenticacion.isAuthenticated());
        assertEquals(java.util.List.of("ROLE_" + rol), autenticacion.getAuthorities().stream()
                .map(a -> a.getAuthority()).filter(a -> a.startsWith("ROLE_")).toList());
        assertNull(autenticacion.getCredentials());
        assertNull(((UserDetails) autenticacion.getPrincipal()).getPassword());
        mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(solicitud("ana@example.com", CLAVE)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.rol").value(rol));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"correo\":\"invalido\",\"password\":\"secreto\"}",
            "{\"correo\":\"ana@example.com\",\"password\":\" \"}"})
    void validaSolicitud(String json) throws Exception {
        mvc.perform(post("/api/auth/login").contentType("application/json").content(json))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(not(containsString("secreto"))));
    }

    private String loginToken() throws Exception {
        var response = mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(solicitud("ana@example.com", CLAVE)))
                .andExpect(status().isOk()).andReturn().getResponse();
        return mapper.readTree(response.getContentAsString()).get("token").asString();
    }

    @Test
    void jwtValidoAutenticaSinSesionNiPersistenciaEntrePeticiones() throws Exception {
        String token = loginToken();
        var resultado = mvc.perform(get("/api/test/protegido").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correo").value("ana@example.com"))
                .andExpect(jsonPath("$.autoridades", contains("ROLE_CLIENTE")))
                .andExpect(jsonPath("$.sinPassword").value(true)).andReturn();
        assertNull(resultado.getRequest().getSession(false));
        assertNull(resultado.getResponse().getCookie("JSESSIONID"));
        var sinToken = mvc.perform(get("/api/test/protegido"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(content().json("{\"mensaje\":\"No autorizado\"}")).andReturn();
        assertNull(sinToken.getRequest().getSession(false));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Bearer basura", "Bearer ", "Basic abc", "Bearer a.b.c"})
    void tokenMalformadoDevuelve401Generico(String header) throws Exception {
        mvc.perform(get("/api/test/protegido").header("Authorization", header))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"mensaje\":\"No autorizado\"}"));
    }

    private String tokenFirmado(String caso) {
        var usuario = usuarios.findByCorreo("ana@example.com").orElseThrow();
        Instant ahora = Instant.now();
        var claims = JwtClaimsSet.builder().issuer(caso.equals("emisor") ? "otro" : jwtIssuer)
                .subject("ana@example.com").issuedAt(ahora.minusSeconds(120))
                .claim("userId", usuario.getId()).claim("rol", "CLIENTE");
        if (!caso.equals("sin-expiracion")) {
            claims.expiresAt(caso.equals("expirado") ? ahora.minusSeconds(1) : ahora.plusSeconds(600));
        }
        byte[] key = Base64.getDecoder().decode(jwtSecret);
        if (caso.equals("firma")) key[0] ^= 1;
        var encoder = NimbusJwtEncoder.withSecretKey(new SecretKeySpec(key, "HmacSHA256")).build();
        return encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).type("JWT").build(), claims.build())).getTokenValue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"expirado", "firma", "emisor", "sin-expiracion"})
    void rechazaJwtFirmadoInvalidoSinExponerDetalles(String caso) throws Exception {
        mvc.perform(get("/api/test/protegido").header("Authorization", "Bearer " + tokenFirmado(caso)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"mensaje\":\"No autorizado\"}"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"inactivo", "eliminado", "recreado"})
    void compruebaUsuarioActualEnCadaPeticion(String caso) throws Exception {
        String token = loginToken();
        var usuario = usuarios.findByCorreo("ana@example.com").orElseThrow();
        if (caso.equals("inactivo")) {
            usuario.setActivo(false);
            usuarios.saveAndFlush(usuario);
        } else {
            usuarios.delete(usuario);
            if (caso.equals("recreado")) {
                servicio.crear(new UsuarioCreacion("Otra", "Persona", "ana@example.com", CLAVE));
            }
        }
        mvc.perform(get("/api/test/protegido").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"mensaje\":\"No autorizado\"}"));
    }

    @Test
    void usaRolVigenteAunqueTokenContengaRolAnterior() throws Exception {
        String token = loginToken();
        var usuario = usuarios.findByCorreo("ana@example.com").orElseThrow();
        usuario.setRol(roles.findByNombre("OPERADOR").orElseThrow());
        usuarios.saveAndFlush(usuario);
        mvc.perform(get("/api/test/protegido").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.autoridades", contains("ROLE_OPERADOR")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/tours", "/api/categorias", "/api/salidas"})
    void consultasPublicasSiguenAbiertasSinToken(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isOk());
    }

    @Test
    void tokenInvalidoEnEndpointPublicoTambienDevuelve401() throws Exception {
        mvc.perform(get("/api/tours").header("Authorization", "Bearer invalido"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"mensaje\":\"No autorizado\"}"));
    }

    @Test
    void usuariosYaNoEsConsultaPublica() throws Exception {
        mvc.perform(get("/api/usuarios")).andExpect(status().isUnauthorized());
    }
}
