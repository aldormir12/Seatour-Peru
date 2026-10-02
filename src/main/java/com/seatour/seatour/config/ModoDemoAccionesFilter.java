package com.seatour.seatour.config;

import com.seatour.seatour.service.ModoDemoService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

/** Desactivar espera a que terminen las acciones de salidas y solicitudes Live. */
@Component
public class ModoDemoAccionesFilter extends OncePerRequestFilter {
    private final ModoDemoService modo;
    public ModoDemoAccionesFilter(ModoDemoService modo) { this.modo = modo; }
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String ruta = request.getServletPath();
        return !ruta.equals("/api/salidas") && !ruta.startsWith("/api/salidas/")
                && !ruta.startsWith("/api/live/");
    }
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        var bloqueo = modo.bloqueoAcciones();
        bloqueo.lock();
        try { chain.doFilter(request, response); }
        finally { bloqueo.unlock(); }
    }
}
