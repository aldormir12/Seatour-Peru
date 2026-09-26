package com.seatour.seatour.security;

import com.seatour.seatour.service.UsuarioDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.AccountStatusUserDetailsChecker;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** Se registra exclusivamente en SecurityFilterChain, no como filtro servlet global. */
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UsuarioDetailsService usuarios;
    private final ApiAuthenticationEntryPoint entryPoint;
    private final AccountStatusUserDetailsChecker checker = new AccountStatusUserDetailsChecker();

    public JwtAuthenticationFilter(JwtService jwtService, UsuarioDetailsService usuarios,
                                   ApiAuthenticationEntryPoint entryPoint) {
        this.jwtService = jwtService;
        this.usuarios = usuarios;
        this.entryPoint = entryPoint;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null) {
            chain.doFilter(request, response);
            return;
        }
        try {
            if (!header.regionMatches(true, 0, "Bearer ", 0, 7) || header.substring(7).isBlank()) {
                throw new BadCredentialsException("Token invalido");
            }
            var jwt = jwtService.validarToken(header.substring(7));
            var usuario = (UsuarioPrincipal) usuarios.loadUserByUsername(jwt.getSubject());
            checker.check(usuario);
            // Impide reutilizar un token si se elimina y recrea el mismo correo.
            if (!usuario.datos().id().equals(jwt.getClaims().get("userId"))) {
                throw new BadCredentialsException("Token invalido");
            }
            usuario.eraseCredentials();
            // Las autoridades vigentes provienen de la BD, no de un rol posiblemente obsoleto.
            var authentication = UsernamePasswordAuthenticationToken.authenticated(
                    usuario, null, usuario.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
        } catch (JwtException | AuthenticationException | IllegalArgumentException ex) {
            SecurityContextHolder.clearContext();
            entryPoint.commence(request, response, new BadCredentialsException("Token invalido"));
            return;
        }
        chain.doFilter(request, response);
    }
}
