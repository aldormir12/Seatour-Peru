package com.seatour.seatour.service;

import com.seatour.seatour.dto.LiveSalidaRespuesta;
import com.seatour.seatour.dto.LiveSalidaRespuesta.Referencia;
import com.seatour.seatour.dto.LiveTokenRespuesta;
import com.seatour.seatour.dto.LoginRespuesta;
import com.seatour.seatour.model.EstadoSalida;
import com.seatour.seatour.repository.SalidaProgramadaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class LiveService {
    private final SalidaProgramadaRepository salidas;
    private final ModoDemoService modoDemo;
    private final String url;
    private final String apiKey;
    private final NimbusJwtEncoder encoder;
    private final RestClient roomService;

    public LiveService(SalidaProgramadaRepository salidas, ModoDemoService modoDemo,
            @Value("${seatour.livekit.url}") String url,
            @Value("${seatour.livekit.api-key}") String apiKey,
            @Value("${seatour.livekit.api-secret}") String apiSecret) {
        this.salidas = salidas;
        this.modoDemo = modoDemo;
        this.url = url.trim();
        this.apiKey = apiKey.trim();
        byte[] secreto = apiSecret.getBytes(StandardCharsets.UTF_8);
        this.encoder = !apiSecret.isBlank() && secreto.length >= 32
                ? NimbusJwtEncoder.withSecretKey(new SecretKeySpec(secreto, "HmacSHA256"))
                    .algorithm(MacAlgorithm.HS256).build()
                : null;
        var fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(2000);
        fabrica.setReadTimeout(2000);
        this.roomService = RestClient.builder().requestFactory(fabrica).build();
    }

    public List<LiveSalidaRespuesta> listar(LoginRespuesta actor) {
        if (actor == null || !"CLIENTE".equals(actor.rol())) throw accesoDenegado();
        return salidas.listarParaLive(modoDemo.activo()).stream()
                .filter(s -> s.getOperador() != null && videoActivo(s.getId(), s.getOperador().getId()))
                .map(s -> new LiveSalidaRespuesta(s.getId(),
                        new Referencia(s.getTour().getId(), s.getTour().getNombre()),
                        ImagenTourService.urlPublica(s.getTour().getImagenUrl()), s.getTour().getZonaMaritima(),
                        new Referencia(s.getEmbarcacion().getId(), s.getEmbarcacion().getNombre()),
                        s.getOperador() == null ? null
                                : new Referencia(s.getOperador().getId(), s.getOperador().getNombre()),
                        s.getInicioReal(), s.getCuposDisponibles(), s.isEsDemo()))
                .toList();
    }

    private boolean videoActivo(Long salidaId, Long operadorId) {
        if (encoder == null || apiKey.isBlank() || !urlValida()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SeaTour Live no está configurado");
        }
        String room = "seatour-salida-" + salidaId;
        String identity = "usuario-" + operadorId + "-salida-" + salidaId;
        Instant ahora = Instant.now();
        // Credencial solo del servidor, limitada a consultar participantes de esta room.
        var claims = JwtClaimsSet.builder().issuer(apiKey).subject("seatour-live-listado")
                .issuedAt(ahora).notBefore(ahora).expiresAt(ahora.plusSeconds(60))
                .claim("video", Map.of("room", room, "roomAdmin", true)).build();
        String credencial = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).type("JWT").build(), claims)).getTokenValue();
        String httpUrl = url.replaceFirst("^wss(?=://)", "https").replaceFirst("^ws(?=://)", "http");
        httpUrl = httpUrl.replaceAll("/+$", "");
        try {
            var respuesta = roomService.post()
                    .uri(URI.create(httpUrl + "/twirp/livekit.RoomService/ListParticipants"))
                    .headers(headers -> headers.setBearerAuth(credencial))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("room", room)).retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            if (respuesta == null || !(respuesta.get("participants") instanceof List<?> participantes)) return false;
            for (var dato : participantes) {
                if (!(dato instanceof Map<?, ?> participante)
                        || !identity.equals(participante.get("identity"))
                        || !valorEnum(participante.get("state"), "ACTIVE", 2)
                        || !(participante.get("tracks") instanceof List<?> pistas)) continue;
                for (var pista : pistas) {
                    if (pista instanceof Map<?, ?> track && valorEnum(track.get("type"), "VIDEO", 1)
                            && !Boolean.TRUE.equals(track.get("muted"))) return true;
                }
            }
            return false;
        } catch (RestClientResponseException ex) {
            // Una room inexistente equivale a una transmision no iniciada o terminada.
            if (ex.getStatusCode().value() == 404) return false;
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudo verificar la transmisión en LiveKit");
        } catch (RestClientException ex) {
            // No publicar salidas sin confirmar video ni exponer errores/credenciales del proveedor.
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudo verificar la transmisión en LiveKit");
        }
    }

    /** Desconecta únicamente los participantes de la transmisión de esta salida demo. */
    public void desconectarDemo(com.seatour.seatour.model.SalidaProgramada salida) {
        if (!salida.isEsDemo() || salida.getEstado() != EstadoSalida.EN_CURSO) return;
        // Sin configuración no se pudieron emitir tokens ni abrir una transmisión desde este backend.
        if (encoder == null || apiKey.isBlank() || !urlValida()) return;
        String room = "seatour-salida-" + salida.getId();
        Instant ahora = Instant.now();
        var claims = JwtClaimsSet.builder().issuer(apiKey).subject("seatour-demo-cierre")
                .issuedAt(ahora).notBefore(ahora).expiresAt(ahora.plusSeconds(60))
                .claim("video", Map.of("room", room, "roomAdmin", true)).build();
        String credencial = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).type("JWT").build(), claims)).getTokenValue();
        String httpUrl = url.replaceFirst("^wss(?=://)", "https").replaceFirst("^ws(?=://)", "http")
                .replaceAll("/+$", "");
        try {
            var respuesta = roomService.post()
                    .uri(URI.create(httpUrl + "/twirp/livekit.RoomService/ListParticipants"))
                    .headers(headers -> headers.setBearerAuth(credencial))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("room", room)).retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            if (respuesta == null || !(respuesta.get("participants") instanceof List<?> participantes)) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "No se pudo verificar el cierre de la transmisión demo");
            }
            for (var dato : participantes) {
                if (!(dato instanceof Map<?, ?> participante)
                        || !(participante.get("identity") instanceof String identity) || identity.isBlank()) {
                    throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                            "No se pudo verificar el cierre de la transmisión demo");
                }
                try {
                    roomService.post()
                            .uri(URI.create(httpUrl + "/twirp/livekit.RoomService/RemoveParticipant"))
                            .headers(headers -> headers.setBearerAuth(credencial))
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(Map.of("room", room, "identity", identity)).retrieve().toBodilessEntity();
                } catch (RestClientResponseException ex) {
                    // Ya salió mientras se procesaba el cierre.
                    if (ex.getStatusCode().value() != 404) throw ex;
                }
            }
        } catch (RestClientResponseException ex) {
            // Room ausente: no hay participantes que desconectar.
            if (ex.getStatusCode().value() == 404) return;
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudo desconectar la transmisión demo; vuelve a intentar desactivar Modo Demo");
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudo desconectar la transmisión demo; vuelve a intentar desactivar Modo Demo");
        }
    }

    private boolean valorEnum(Object valor, String nombre, int numero) {
        return nombre.equals(valor) || valor instanceof Number n && n.intValue() == numero;
    }

    public LiveTokenRespuesta token(LoginRespuesta actor, Long salidaId) {
        if (actor == null || actor.id() == null
                || !("CLIENTE".equals(actor.rol()) || "OPERADOR".equals(actor.rol()))) throw accesoDenegado();
        var salida = salidas.buscarIncluyendoDemo(salidaId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Salida no encontrada"));
        if (salida.isEsDemo() && !modoDemo.activo())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Salida no encontrada");
        boolean operador = "OPERADOR".equals(actor.rol());
        if (operador && (salida.getOperador() == null
                || !Objects.equals(salida.getOperador().getId(), actor.id()))) throw accesoDenegado();
        if (salida.getEstado() != EstadoSalida.EN_CURSO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La salida no está EN_CURSO");
        }
        // El operador puede empezar a publicar; el cliente demo solo entra con video real.
        if (salida.isEsDemo() && !operador && (salida.getOperador() == null
                || !videoActivo(salida.getId(), salida.getOperador().getId())))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La transmisión no está activa");
        if (encoder == null || apiKey.isBlank() || !urlValida()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SeaTour Live no está configurado");
        }
        String room = "seatour-salida-" + salida.getId();
        String identity = "usuario-" + actor.id() + "-salida-" + salida.getId();
        Instant ahora = Instant.now();
        Instant expiracion = ahora.plusSeconds(600);
        var claims = JwtClaimsSet.builder().issuer(apiKey).subject(identity)
                .issuedAt(ahora).notBefore(ahora).expiresAt(expiracion)
                .claim("video", Map.of("room", room, "roomJoin", true,
                        "canPublish", operador, "canSubscribe", true, "canPublishData", operador))
                .build();
        String token = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).type("JWT").build(), claims)).getTokenValue();
        return new LiveTokenRespuesta(url, token, room, identity, expiracion);
    }

    private boolean urlValida() {
        try {
            URI uri = URI.create(url);
            return ("ws".equalsIgnoreCase(uri.getScheme()) || "wss".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && uri.getUserInfo() == null
                    && uri.getQuery() == null && uri.getFragment() == null;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private ResponseStatusException accesoDenegado() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "Acceso denegado");
    }
}
