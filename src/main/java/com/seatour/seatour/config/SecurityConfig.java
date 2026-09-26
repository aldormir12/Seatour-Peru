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

                        // Solo las consultas son publicas. HEAD conserva los permisos de GET.
                        .requestMatchers(HttpMethod.GET, "/api/tours/**", "/api/categorias/**", "/api/salidas/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/api/tours/**", "/api/categorias/**", "/api/salidas/**")
                        .permitAll()

                        // El resto de operaciones de usuarios es administrativo.
                        .requestMatchers(
                                "/api/usuarios/**")
                        .hasRole("ADMIN")

                        // Gestion operativa: cualquier metodo distinto de las consultas anteriores.
                        .requestMatchers(
                                "/api/tours/**",
                                "/api/categorias/**")
                        .hasAnyRole("OPERADOR", "ADMIN")

                        // Gestion de salidas programadas.
                        .requestMatchers(
                                "/api/salidas/**")
                        .hasAnyRole("OPERADOR", "ADMIN")

                        // Regla preparada para la API de gestion de embarcaciones.
                        .requestMatchers("/api/embarcaciones/**")
                        .hasAnyRole("OPERADOR", "ADMIN")

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
