package com.seatour.seatour.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import javax.crypto.spec.SecretKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Service
public class JwtService {
    private final NimbusJwtEncoder encoder;
    private final NimbusJwtDecoder decoder;
    private final long expirationSeconds;
    private final String issuer;

    public JwtService(@Value("${seatour.jwt.secret}") String secret,
                      @Value("${seatour.jwt.expiration-seconds}") long expirationSeconds,
                      @Value("${seatour.jwt.issuer}") String issuer) {
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("seatour.jwt.secret debe estar codificado en Base64");
        }
        if (keyBytes.length < 32) {
            throw new IllegalArgumentException("seatour.jwt.secret debe contener al menos 32 bytes");
        }
        if (expirationSeconds <= 0 || issuer.isBlank()) {
            throw new IllegalArgumentException("JWT requiere expiracion positiva y emisor no vacio");
        }
        var key = new SecretKeySpec(keyBytes, "HmacSHA256");
        this.encoder = NimbusJwtEncoder.withSecretKey(key).algorithm(MacAlgorithm.HS256).build();
        this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        this.decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(Duration.ZERO), new JwtIssuerValidator(issuer)));
        this.expirationSeconds = expirationSeconds;
        this.issuer = issuer;
    }

    public String generarToken(UsuarioPrincipal usuario) {
        Instant ahora = Instant.now();
        var claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(usuario.getUsername())
                .issuedAt(ahora)
                .expiresAt(ahora.plusSeconds(expirationSeconds))
                .claim("userId", usuario.datos().id())
                .claim("rol", usuario.datos().rol())
                .build();
        return encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).type("JWT").build(), claims)).getTokenValue();
    }

    /** Solo devuelve claims despues de verificar firma, algoritmo, emisor y fechas. */
    public Jwt validarToken(String token) {
        Jwt jwt = decoder.decode(token);
        Object id = jwt.getClaims().get("userId");
        Object rol = jwt.getClaims().get("rol");
        if (jwt.getSubject() == null || jwt.getSubject().isBlank()
                || jwt.getExpiresAt() == null || jwt.getIssuedAt() == null
                || !jwt.getExpiresAt().isAfter(Instant.now())
                || !(id instanceof Long userId) || userId <= 0
                || !(rol instanceof String nombreRol) || nombreRol.isBlank()) {
            throw new BadJwtException("Token invalido");
        }
        return jwt;
    }

    public String extraerCorreo(String token) {
        return validarToken(token).getSubject();
    }

    public String extraerRol(String token) {
        return validarToken(token).getClaimAsString("rol");
    }
}
