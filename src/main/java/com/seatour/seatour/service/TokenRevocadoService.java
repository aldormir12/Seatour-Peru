package com.seatour.seatour.service;

import com.seatour.seatour.repository.TokenRevocadoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
public class TokenRevocadoService {
    private final TokenRevocadoRepository tokens;
    public TokenRevocadoService(TokenRevocadoRepository tokens) { this.tokens = tokens; }

    @Transactional(readOnly = true)
    public boolean revocado(String token) { return tokens.existsById(huella(token)); }

    @Transactional
    public void revocar(String token, Instant expira) { tokens.revocar(huella(token), expira); }

    @Scheduled(initialDelay = 300000, fixedDelay = 300000)
    @Transactional
    public void limpiar() { tokens.limpiarVencidos(Instant.now()); }

    private String huella(String token) {
        try {
            // Normalizar la firma: representaciones Base64URL equivalentes no eluden la revocación.
            String[] partes = token.split("\\.", -1);
            if (partes.length != 3) throw new IllegalArgumentException("Token invalido");
            String firma = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(
                    java.util.Base64.getUrlDecoder().decode(partes[2]));
            String canonico = partes[0] + "." + partes[1] + "." + firma;
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(canonico.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("No se pudo inicializar la revocación de sesiones");
        }
    }
}
