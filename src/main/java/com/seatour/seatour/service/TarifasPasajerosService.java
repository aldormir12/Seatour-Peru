package com.seatour.seatour.service;
import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.*;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.*;
import java.time.*;
import java.util.List;

@Service
public class TarifasPasajerosService {
    // Fuente unica para todos los tours y para la vista previa del frontend.
    private static final List<TarifaPasajeroRespuesta> TARIFAS = List.of(
            new TarifaPasajeroRespuesta(TipoPasajero.NINO, "Niño", 0, 12, new BigDecimal("30")),
            new TarifaPasajeroRespuesta(TipoPasajero.ADULTO, "Adulto", 13, 59, BigDecimal.ZERO),
            new TarifaPasajeroRespuesta(TipoPasajero.ADULTO_MAYOR, "Adulto mayor", 60, null, new BigDecimal("20")));
    public List<TarifaPasajeroRespuesta> listar() { return TARIFAS; }
    public BigDecimal precio(TipoPasajero tipo, BigDecimal base) {
        var tarifa = TARIFAS.stream().filter(t -> t.tipo() == tipo).findFirst().orElseThrow();
        return base.setScale(2, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100").subtract(tarifa.porcentajeDescuento()))
                .movePointLeft(2).setScale(2, RoundingMode.HALF_UP);
    }
    public BigDecimal total(BigDecimal base, int ninos, int adultos, int mayores) {
        return precio(TipoPasajero.NINO, base).multiply(BigDecimal.valueOf(ninos))
                .add(precio(TipoPasajero.ADULTO, base).multiply(BigDecimal.valueOf(adultos)))
                .add(precio(TipoPasajero.ADULTO_MAYOR, base).multiply(BigDecimal.valueOf(mayores)));
    }
}
