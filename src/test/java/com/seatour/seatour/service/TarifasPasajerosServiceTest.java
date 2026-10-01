package com.seatour.seatour.service;
import com.seatour.seatour.model.TipoPasajero;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
class TarifasPasajerosServiceTest {
    private final TarifasPasajerosService tarifas = new TarifasPasajerosService();
    @ParameterizedTest
    @CsvSource({"NINO,56.18", "ADULTO,80.25", "ADULTO_MAYOR,64.20"})
    void precioPorCategoria(TipoPasajero tipo, String precio) {
        assertEquals(new BigDecimal(precio), tarifas.precio(tipo, new BigDecimal("80.25")));
    }
    @Test
    void sumaPorCantidades() {
        assertEquals(new BigDecimal("200.63"), tarifas.total(new BigDecimal("80.25"), 1, 1, 1));
        assertEquals(new BigDecimal("112.36"), tarifas.total(new BigDecimal("80.25"), 2, 0, 0));
    }
}
