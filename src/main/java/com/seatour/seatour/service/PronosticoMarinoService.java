package com.seatour.seatour.service;

import com.seatour.seatour.dto.MejorOpcionRespuesta.Condiciones;
import com.seatour.seatour.model.ZonaMaritima;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
public class PronosticoMarinoService {
    private final RestClient cliente;

    public PronosticoMarinoService() {
        var fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(2000);
        fabrica.setReadTimeout(2000);
        cliente = RestClient.builder().requestFactory(fabrica).build();
    }

    public record Pronostico(Map<String, List<Object>> hourly) {}
    public record Datos(Pronostico meteorologico, Pronostico marino) {}

    public Datos consultar(ZonaMaritima zona, LocalDate fecha) {
        // Mismos puntos costeros y contrato horario que OceanService.
        String coordenadas = switch (zona) {
            case MANCORA -> "latitude=-4.107&longitude=-81.05";
            case LOS_ORGANOS -> "latitude=-4.179&longitude=-81.131";
            case CABO_BLANCO -> "latitude=-4.25&longitude=-81.231";
            case TALARA -> "latitude=-4.58&longitude=-81.28";
        };
        String parametros = "?" + coordenadas + "&timezone=America%2FLima&start_date=" + fecha
                + "&end_date=" + fecha;
        return new Datos(
                obtener("https://api.open-meteo.com/v1/forecast" + parametros
                        + "&hourly=wind_speed_10m,visibility&wind_speed_unit=kmh"),
                obtener("https://marine-api.open-meteo.com/v1/marine" + parametros
                        + "&hourly=wave_height&cell_selection=sea"));
    }

    private Pronostico obtener(String url) {
        try {
            return cliente.get().uri(java.net.URI.create(url)).retrieve().body(Pronostico.class);
        } catch (RestClientException ex) {
            // Un proveedor caído o una fecha fuera de cobertura no impiden recomendar.
            return null;
        }
    }

    public Condiciones condiciones(Datos datos, LocalDateTime inicio, LocalDateTime fin) {
        Double oleaje = null, viento = null, visibilidad = null;
        boolean completa = true;
        for (var hora = inicio.truncatedTo(ChronoUnit.HOURS); hora.isBefore(fin); hora = hora.plusHours(1)) {
            Double o = valor(datos.marino(), "wave_height", hora);
            Double v = valor(datos.meteorologico(), "wind_speed_10m", hora);
            Double vis = valor(datos.meteorologico(), "visibility", hora);
            completa &= o != null && v != null && vis != null;
            if (o != null) oleaje = oleaje == null ? o : Math.max(oleaje, o);
            if (v != null) viento = viento == null ? v : Math.max(viento, v);
            if (vis != null) visibilidad = visibilidad == null ? vis : Math.min(visibilidad, vis);
        }
        String estado = completa ? "COMPLETO"
                : oleaje == null && viento == null && visibilidad == null ? "NO_DISPONIBLE" : "PARCIAL";
        return new Condiciones(estado, oleaje, viento, visibilidad);
    }

    private Double valor(Pronostico datos, String variable, LocalDateTime hora) {
        if (datos == null || datos.hourly() == null) return null;
        var horas = datos.hourly().get("time");
        var valores = datos.hourly().get(variable);
        if (horas == null || valores == null) return null;
        int indice = horas.indexOf(hora.toString());
        if (indice < 0 || indice >= valores.size() || !(valores.get(indice) instanceof Number numero)) return null;
        double valor = numero.doubleValue();
        return Double.isFinite(valor) && valor >= 0 ? valor : null;
    }
}
