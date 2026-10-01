package com.seatour.seatour.service;

import com.seatour.seatour.dto.LiveSalidaRespuesta;
import com.seatour.seatour.dto.LiveSalidaRespuesta.Referencia;
import com.seatour.seatour.dto.LiveTokenRespuesta;
import com.seatour.seatour.dto.LoginRespuesta;
import com.seatour.seatour.model.EstadoSalida;
import com.seatour.seatour.repository.SalidaProgramadaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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
    private final String url;
    private final String apiKey;
    private final NimbusJwtEncoder encoder;

    public LiveService(SalidaProgramadaRepository salidas,
            @Value("${seatour.livekit.url}") String url,
            @Value("${seatour.livekit.api-key}") String apiKey,
            @Value("${seatour.livekit.api-secret}") String apiSecret) {
        this.salidas = salidas;
        this.url = url.trim();
        this.apiKey = apiKey.trim();
        byte[] secreto = apiSecret.getBytes(StandardCharsets.UTF_8);
        this.encoder = !apiSecret.isBlank() && secreto.length >= 32
                ? NimbusJwtEncoder.withSecretKey(new SecretKeySpec(secreto, "HmacSHA256"))
                    .algorithm(MacAlgorithm.HS256).build()
                : null;
    }

    public List<LiveSalidaRespuesta> listar(LoginRespuesta actor) {
        if (actor == null || !"CLIENTE".equals(actor.rol())) throw accesoDenegado();
        return salidas.findByEstadoOrderByInicioRealDescIdDesc(EstadoSalida.EN_CURSO).stream()
                .map(s -> new LiveSalidaRespuesta(s.getId(),
                        new Referencia(s.getTour().getId(), s.getTour().getNombre()),
                        ImagenTourService.urlPublica(s.getTour().getImagenUrl()), s.getTour().getZonaMaritima(),
                        new Referencia(s.getEmbarcacion().getId(), s.getEmbarcacion().getNombre()),
                        s.getOperador() == null ? null
                                : new Referencia(s.getOperador().getId(), s.getOperador().getNombre()),
                        s.getInicioReal(), s.getCuposDisponibles()))
                .toList();
    }

    public LiveTokenRespuesta token(LoginRespuesta actor, Long salidaId) {
        if (actor == null || actor.id() == null
                || !("CLIENTE".equals(actor.rol()) || "OPERADOR".equals(actor.rol()))) throw accesoDenegado();
        var salida = salidas.findById(salidaId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Salida no encontrada"));
        boolean operador = "OPERADOR".equals(actor.rol());
        if (operador && (salida.getOperador() == null
                || !Objects.equals(salida.getOperador().getId(), actor.id()))) throw accesoDenegado();
        if (salida.getEstado() != EstadoSalida.EN_CURSO) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La salida no está EN_CURSO");
        }
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
