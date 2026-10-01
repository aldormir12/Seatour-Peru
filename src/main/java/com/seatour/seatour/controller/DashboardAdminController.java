package com.seatour.seatour.controller;

import com.seatour.seatour.dto.DashboardAdminRespuesta;
import com.seatour.seatour.service.DashboardAdminService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/dashboard")
public class DashboardAdminController {
    private final DashboardAdminService dashboard;

    public DashboardAdminController(DashboardAdminService dashboard) { this.dashboard = dashboard; }

    @GetMapping
    public DashboardAdminRespuesta resumen(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return dashboard.resumen(desde, hasta);
    }
}
