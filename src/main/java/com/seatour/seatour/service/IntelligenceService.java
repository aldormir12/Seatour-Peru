package com.seatour.seatour.service;

import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.*;
import com.seatour.seatour.repository.TourRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.text.Normalizer;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class IntelligenceService {
    private final PreferenciasClienteService preferencias;
    private final TourRepository tours;
    private final SalidaProgramadaService salidas;
    private final PronosticoMarinoService pronostico;

    public IntelligenceService(PreferenciasClienteService preferencias, TourRepository tours,
            SalidaProgramadaService salidas, PronosticoMarinoService pronostico) {
        this.preferencias = preferencias; this.tours = tours; this.salidas = salidas;
        this.pronostico = pronostico;
    }

    public MejorOpcionRespuesta mejorOpcion(LoginRespuesta actor, LocalDate fecha) {
        var perfil = preferencias.consultar(actor);
        var ahora = LocalDateTime.now(ZoneId.of("America/Lima"));
        List<Opcion> opciones = new ArrayList<>();
        var climaPorZona = new EnumMap<ZonaMaritima, PronosticoMarinoService.Datos>(ZonaMaritima.class);
        for (var tour : tours.findByActivoTrueOrderByNombreAsc()) {
            if (tour.getZonaMaritima() == null || tour.getDuracionMinutos() == null
                    || tour.getDuracionMinutos() <= 0) continue;
            for (var salida : salidas.listarDisponiblesPorTour(tour.getId())) {
                if (!fecha.equals(salida.getFecha()) || salida.getHoraSalida() == null
                        || salida.getCuposDisponibles() == null || salida.getCuposDisponibles() <= 0
                        || !dentroDelHorizonte(salida)) continue;
                var inicio = fecha.atTime(salida.getHoraSalida());
                if (!inicio.isAfter(ahora)) continue;
                var fin = inicio.plusMinutes(tour.getDuracionMinutos());
                var datos = climaPorZona.computeIfAbsent(tour.getZonaMaritima(),
                        zona -> pronostico.consultar(zona, fecha));
                opciones.add(new Opcion(tour, salida, evaluar(tour, salida, perfil).score(),
                        inicio, fin, pronostico.condiciones(datos, inicio, fin)));
            }
        }
        if (opciones.isEmpty()) {
            return new MejorOpcionRespuesta(fecha, "SIN_SALIDAS", null, null, null,
                    new MejorOpcionRespuesta.Condiciones("NO_DISPONIBLE", null, null, null),
                    new MejorOpcionRespuesta.Disponibilidad(false, 0),
                    "No hay salidas disponibles en las cuatro zonas para esta fecha.");
        }
        // El score existente no se modifica. El clima solo desempata afinidades iguales.
        int mayorAfinidad = opciones.stream().mapToInt(Opcion::score).max().orElseThrow();
        var finalistas = opciones.stream().filter(o -> o.score() == mayorAfinidad).toList();
        // Comparar solo con cobertura completa evita premiar zonas con datos ausentes.
        boolean usarClima = finalistas.stream().allMatch(o -> "COMPLETO".equals(o.condiciones().estado()));
        Comparator<Opcion> orden = Comparator.comparingInt((Opcion o) -> usarClima ? nivelMarino(o) : 0)
                .thenComparing(Comparator.comparingInt((Opcion o) -> o.salida().getCuposDisponibles()).reversed())
                .thenComparing(Opcion::inicio).thenComparing(o -> o.salida().getId());
        var mejor = finalistas.stream().min(orden).orElseThrow();
        String insight = usarClima
                ? "Mayor afinidad disponible; el pronóstico de toda la salida ayuda a elegir entre opciones equivalentes."
                : "Recomendación por afinidad y cupos; pronóstico incompleto para comparar las opciones.";
        if (usarClima && nivelMarino(mejor) == 2) {
            insight = "Mayor afinidad disponible, con condiciones marítimas menos favorables; consulta al operador.";
        }
        return new MejorOpcionRespuesta(fecha, "RECOMENDACION_DISPONIBLE", mejor.tour().getZonaMaritima(),
                new MejorOpcionRespuesta.Ventana(mejor.inicio(), mejor.fin()),
                new MejorOpcionRespuesta.TourSalida(mejor.tour().getId(), mejor.tour().getNombre(),
                        mejor.salida().getId(), mejor.score(), ImagenTourService.urlPublica(mejor.tour().getImagenUrl())), mejor.condiciones(),
                new MejorOpcionRespuesta.Disponibilidad(true, mejor.salida().getCuposDisponibles()), insight);
    }

    private record Opcion(Tour tour, SalidaProgramada salida, int score, LocalDateTime inicio,
            LocalDateTime fin, MejorOpcionRespuesta.Condiciones condiciones) {}

    private int nivelMarino(Opcion opcion) {
        var c = opcion.condiciones();
        // Mismos umbrales orientativos que las etiquetas marinas existentes; no autorizan navegación.
        if (c.oleajeMaximoMetros() <= 1 && c.vientoMaximoKmh() <= 20 && c.visibilidadMinimaMetros() >= 8000) return 0;
        if (c.oleajeMaximoMetros() <= 1.5 && c.vientoMaximoKmh() <= 28 && c.visibilidadMinimaMetros() >= 5000) return 1;
        return 2;
    }

    public List<RecomendacionRespuesta> recomendar(LoginRespuesta actor) {
        // Reutiliza la comprobación de identidad, rol CLIENTE y cuenta activa.
        var perfil = preferencias.consultar(actor);
        List<RecomendacionRespuesta> resultado = new ArrayList<>();
        for (var tour : tours.findByActivoTrueOrderByNombreAsc()) {
            var mejor = mejorRecomendacion(tour, perfil);
            if (mejor != null) resultado.add(mejor);
        }
        return resultado.stream().sorted(Comparator.comparingInt(RecomendacionRespuesta::score).reversed()
                .thenComparing(RecomendacionRespuesta::tourId)).toList();
    }

    public List<AfinidadRespuesta> afinidades(LoginRespuesta actor) {
        var perfil = preferencias.consultar(actor);
        return tours.findByActivoTrueOrderByNombreAsc().stream().map(tour -> {
            var mejor = mejorRecomendacion(tour, perfil);
            int score = (mejor == null ? evaluar(tour, null, perfil) : mejor).score();
            String nivel = score >= 90 ? "IDEAL" : score >= 75 ? "ALTA" : score >= 50 ? "BUENA"
                    : score >= 25 ? "BAJA" : "MUY_BAJA";
            return new AfinidadRespuesta(tour.getId(), score, nivel);
        }).sorted(Comparator.comparingInt(AfinidadRespuesta::score).reversed()
                .thenComparing(AfinidadRespuesta::tourId)).toList();
    }

    public PlanDiaRespuesta planDia(LoginRespuesta actor, LocalDate fecha, ZonaMaritima zonaMaritima) {
        var perfil = preferencias.consultar(actor);
        var ahora = LocalDateTime.now(ZoneId.of("America/Lima"));
        var fechaPlan = fecha == null ? ahora.toLocalDate() : fecha;
        List<PlanDiaRespuesta.Item> candidatos = new ArrayList<>();
        for (var tour : tours.findByActivoTrueOrderByNombreAsc()) {
            if (zonaMaritima == null || tour.getZonaMaritima() != zonaMaritima) continue;
            Integer duracion = tour.getDuracionMinutos();
            if (duracion == null || duracion <= 0) continue;
            for (var salida : salidas.listarDisponiblesPorTour(tour.getId())) {
                if (!salida.getFecha().equals(fechaPlan)
                        || salida.getCuposDisponibles() == null || salida.getCuposDisponibles() <= 0
                        || !dentroDelHorizonte(salida)) continue;
                var inicio = salida.getFecha().atTime(salida.getHoraSalida());
                if (!inicio.isAfter(ahora)) continue;
                int score = evaluar(tour, salida, perfil).score();
                candidatos.add(new PlanDiaRespuesta.Item(tour.getId(), tour.getNombre(), salida.getId(),
                        inicio, inicio.plusMinutes(duracion), duracion, score,
                        tour.getPrecioBase(), tour.getImagenUrl()));
            }
        }
        candidatos.sort(Comparator.comparingInt(PlanDiaRespuesta.Item::score).reversed()
                .thenComparing(PlanDiaRespuesta.Item::horaInicio)
                .thenComparing(PlanDiaRespuesta.Item::salidaId));
        List<PlanDiaRespuesta.Item> seleccionados = new ArrayList<>();
        for (var candidato : candidatos) {
            boolean incompatible = seleccionados.stream().anyMatch(item ->
                    item.tourId().equals(candidato.tourId())
                    || (candidato.horaInicio().isBefore(item.horaFin())
                        && item.horaInicio().isBefore(candidato.horaFin())));
            if (incompatible) continue;
            seleccionados.add(candidato);
            if (seleccionados.size() == 3) break;
        }
        seleccionados.sort(Comparator.comparing(PlanDiaRespuesta.Item::horaInicio));
        var precioTotal = seleccionados.stream().map(PlanDiaRespuesta.Item::precioBase)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long duracionTotal = seleccionados.stream().mapToLong(PlanDiaRespuesta.Item::duracionMinutos).sum();
        return new PlanDiaRespuesta(List.copyOf(seleccionados), precioTotal, duracionTotal,
                seleccionados.isEmpty() ? null : seleccionados.getFirst().horaInicio(),
                seleccionados.isEmpty() ? null : seleccionados.getLast().horaFin());
    }

    private RecomendacionRespuesta mejorRecomendacion(Tour tour, PreferenciasCliente perfil) {
            var disponibles = salidas.listarDisponiblesPorTour(tour.getId()).stream()
                    .filter(this::dentroDelHorizonte)
                    .sorted(Comparator.comparing(SalidaProgramada::getFecha)
                            .thenComparing(SalidaProgramada::getHoraSalida).thenComparing(SalidaProgramada::getId))
                    .toList();
            RecomendacionRespuesta mejor = null;
            for (var salida : disponibles) {
                var propuesta = evaluar(tour, salida, perfil);
                // En empate conserva la salida más próxima.
                if (mejor == null || propuesta.score() > mejor.score()) mejor = propuesta;
            }
            return mejor;
    }

    private boolean dentroDelHorizonte(SalidaProgramada salida) {
        try { HorizonteOperativo.validar(salida.getFecha()); return true; }
        catch (ResponseStatusException ex) { return false; }
    }

    private RecomendacionRespuesta evaluar(Tour tour, SalidaProgramada salida, PreferenciasCliente perfil) {
        int score = salida == null ? 0 : 15;
        List<String> razones = new ArrayList<>();
        if (salida != null) razones.add("Disponibilidad: +15; " + salida.getCuposDisponibles() + " cupos disponibles el "
                + salida.getFecha() + " a las " + salida.getHoraSalida() + " (America/Lima).");
        String texto = normalizar(tour.getNombre() + " " + tour.getDescripcion() + " " + tour.getCategoriaTour().getNombre());
        boolean favorita = perfil.categoriasFavoritas().contains(tour.getCategoriaTour().getId());
        var intereses = perfil.prioridades().stream().filter(p -> !p.isBlank())
                .filter(p -> (" " + texto + " ").contains(" " + normalizar(p) + " ")).toList();
        if (favorita || !intereses.isEmpty()) {
            score += 35;
            razones.add(favorita ? "Categoría/intereses: +35; categoría favorita " + tour.getCategoriaTour().getNombre() + "."
                    : "Categoría/intereses: +35; coincidencia textual con " + String.join(", ", intereses) + ".");
        } else razones.add("Categoría/intereses: +0; sin coincidencia con categorías favoritas o intereses registrados.");

        if (perfil.presupuestoMaximo() != null && tour.getPrecioBase().compareTo(perfil.presupuestoMaximo()) <= 0) {
            score += 20;
            razones.add("Presupuesto: +20; precio base por pasajero S/ " + tour.getPrecioBase() + " dentro del máximo, sin adicionales.");
        } else razones.add("Presupuesto: +0; máximo no configurado o precio base superior al máximo.");

        if (salida != null && perfil.horarioPreferido().stream().anyMatch(h -> coincideHorario(h, salida.getHoraSalida()))) {
            score += 20;
            razones.add("Horario: +20; coincide con un horario preferido (America/Lima).");
        } else razones.add("Horario: +0; sin coincidencia con los horarios preferidos.");

        if (perfil.duracionPreferidaMinutos() != null && tour.getDuracionMinutos() <= perfil.duracionPreferidaMinutos()) {
            score += 10;
            razones.add("Duración: +10; " + tour.getDuracionMinutos() + " minutos, dentro de la duración preferida.");
        } else razones.add("Duración: +0; duración preferida no configurada o tour más largo.");
        return new RecomendacionRespuesta(tour.getId(), tour.getNombre(), score,
                salida == null ? null : salida.getId(), salida == null ? null : salida.getHoraSalida(), List.copyOf(razones));
    }

    // Franjas locales sin solapamiento: mañana <12, mediodía 12–14, tarde 14–17, atardecer >=17.
    private boolean coincideHorario(String horario, LocalTime hora) {
        return switch (horario) {
            case "CUALQUIERA" -> true;
            case "MANANA" -> hora.isBefore(LocalTime.NOON);
            case "MEDIODIA" -> !hora.isBefore(LocalTime.NOON) && hora.isBefore(LocalTime.of(14, 0));
            case "TARDE" -> !hora.isBefore(LocalTime.of(14, 0)) && hora.isBefore(LocalTime.of(17, 0));
            case "ATARDECER" -> !hora.isBefore(LocalTime.of(17, 0));
            default -> false;
        };
    }

    private String normalizar(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }
}
