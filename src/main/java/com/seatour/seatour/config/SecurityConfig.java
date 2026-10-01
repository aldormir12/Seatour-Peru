package com.seatour.seatour.config;

import com.seatour.seatour.security.ApiAuthenticationEntryPoint;
import com.seatour.seatour.security.JwtAuthenticationFilter;
import com.seatour.seatour.security.JwtService;
import com.seatour.seatour.service.UsuarioDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService usuarios, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(usuarios);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http, JwtService jwtService, UsuarioDetailsService usuarios,
            ApiAuthenticationEntryPoint entryPoint) throws Exception {

        http
                .cors(org.springframework.security.config.Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session -> session.sessionCreationPolicy(
                        SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .exceptionHandling(errors -> errors.authenticationEntryPoint(entryPoint)
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write("{\"mensaje\":\"Acceso denegado\"}");
                        }))
                .addFilterBefore(new JwtAuthenticationFilter(jwtService, usuarios, entryPoint),
                        UsernamePasswordAuthenticationFilter.class)

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/usuarios").permitAll()

                        .requestMatchers("/api/admin/adicionales", "/api/admin/adicionales/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/dashboard", "/api/admin/dashboard/**").hasRole("ADMIN")
                        .requestMatchers("/api/intelligence/**").hasRole("CLIENTE")
                        .requestMatchers(HttpMethod.GET, "/api/live/salidas").hasRole("CLIENTE")
                        .requestMatchers(HttpMethod.POST, "/api/live/salidas/*/token").hasAnyRole("CLIENTE", "OPERADOR")
                        .requestMatchers("/api/live/**").denyAll()

                        .requestMatchers(HttpMethod.POST, "/api/reservas/*/pagos").hasRole("CLIENTE")
                        .requestMatchers(HttpMethod.POST, "/api/reservas").hasRole("CLIENTE")
                        .requestMatchers(HttpMethod.GET, "/api/reservas/mis-reservas").hasRole("CLIENTE")
                        .requestMatchers(HttpMethod.HEAD, "/api/reservas/mis-reservas").hasRole("CLIENTE")
                        .requestMatchers(HttpMethod.GET, "/api/reservas").hasAnyRole("OPERADOR", "ADMIN")
                        .requestMatchers(HttpMethod.HEAD, "/api/reservas").hasAnyRole("OPERADOR", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/reservas/*/confirmar").hasAnyRole("OPERADOR", "ADMIN")
                        .requestMatchers("/api/reservas/**").hasAnyRole("CLIENTE", "OPERADOR", "ADMIN")

                        .requestMatchers("/api/salidas/embarcaciones/activas")
                        .hasAnyRole("OPERADOR", "ADMIN")

                        // Solo las consultas son publicas. HEAD conserva los permisos de GET.
                        .requestMatchers("/api/salidas/mis-salidas", "/api/salidas/mis-salidas/**")
                        .hasRole("OPERADOR")
                        .requestMatchers(HttpMethod.GET, "/api/tours/**", "/api/categorias/**", "/api/salidas/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/api/tours/**", "/api/categorias/**", "/api/salidas/**")
                        .permitAll()

                        // El resto de operaciones de usuarios es administrativo.
                        .requestMatchers("/api/usuarios/me/preferencias").hasRole("CLIENTE")
                        .requestMatchers(
                                "/api/usuarios/**")
                        .hasRole("ADMIN")

                        .requestMatchers("/api/admin/categorias", "/api/admin/categorias/**",
                                "/api/categorias", "/api/categorias/**")
                        .hasRole("ADMIN")

                        .requestMatchers("/api/admin/tours", "/api/admin/tours/**",
                                "/api/tours", "/api/tours/**")
                        .hasRole("ADMIN")

                        // Gestion de salidas programadas.
                        .requestMatchers(HttpMethod.PATCH, "/api/salidas/*/estado")
                        .hasAnyRole("OPERADOR", "ADMIN")
                        .requestMatchers(
                                "/api/salidas/**")
                        .hasRole("ADMIN")

                        // Consulta de cliente; ADMIN conserva su acceso. HEAD replica GET.
                        .requestMatchers(HttpMethod.GET, "/api/embarcaciones/{id}",
                                "/api/embarcaciones/imagenes/{nombre}")
                        .hasAnyRole("CLIENTE", "ADMIN")
                        .requestMatchers(HttpMethod.HEAD, "/api/embarcaciones/{id}",
                                "/api/embarcaciones/imagenes/{nombre}")
                        .hasAnyRole("CLIENTE", "ADMIN")

                        // El resto de operaciones de embarcaciones sigue siendo administrativo.
                        .requestMatchers("/api/admin/embarcaciones", "/api/admin/embarcaciones/**",
                                "/api/embarcaciones", "/api/embarcaciones/**")
                        .hasRole("ADMIN")

                        // H2 durante desarrollo
                        .requestMatchers(
                                "/h2-console/**")
                        .permitAll()

                        // Todo lo demás requiere autenticación
                        .anyRequest().authenticated())

                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))

                .httpBasic(httpBasic -> httpBasic.disable())

                .formLogin(form -> form.disable());

        return http.build();
    }
}
