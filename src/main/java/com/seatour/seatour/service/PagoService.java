package com.seatour.seatour.service;
import com.seatour.seatour.dto.*;
import com.seatour.seatour.model.*;
import com.seatour.seatour.repository.PagoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.YearMonth;
import java.time.ZoneId;

@Service
public class PagoService {
    private final PagoRepository pagos;
    private final ReservaService reservas;
    private final ComprobanteReservaService comprobantes;
    public PagoService(PagoRepository pagos, ReservaService reservas, ComprobanteReservaService comprobantes) {
        this.pagos = pagos; this.reservas = reservas; this.comprobantes = comprobantes;
    }
    @Transactional
    public PagoRespuesta pagar(Long reservaId, PagoSolicitud datos, LoginRespuesta actor) {
        if (!"CLIENTE".equals(actor.rol())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo CLIENTE puede pagar");
        validar(datos);
        var reserva = reservas.bloquearParaPago(reservaId, actor);
        if (pagos.existsByReservaIdAndEstado(reservaId, EstadoPago.APROBADO))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La reserva ya tiene un pago aprobado");
        if (reserva.getEstado() != EstadoReserva.PENDIENTE)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solo se pueden pagar reservas pendientes");
        boolean tarjeta = datos.metodo() == MetodoPago.TARJETA;
        // Regla simulada y determinista: ultimo digito par aprueba; impar rechaza.
        String control = tarjeta ? datos.tarjeta().numero() : datos.yape().codigoAprobacion();
        boolean aprobado = (control.charAt(control.length() - 1) - '0') % 2 == 0;
        String numero = tarjeta ? datos.tarjeta().numero() : null;
        var pago = pagos.saveAndFlush(new Pago(reserva, datos.metodo(),
                aprobado ? EstadoPago.APROBADO : EstadoPago.RECHAZADO,
                tarjeta ? numero.substring(numero.length() - 4) : null,
                tarjeta ? marca(numero) : null));
        if (aprobado) {
            reservas.confirmarPorPago(reserva);
            comprobantes.preparar(reserva);
        }
        return new PagoRespuesta(pago.getEstado(), reserva.getEstado(), reservaId, pago.getId(),
                pago.getMetodo(), pago.getMonto(), pago.getReferencia(),
                aprobado ? "Pago simulado aprobado; reserva confirmada" : "Pago simulado rechazado; reserva pendiente",
                pago.getMotivoRechazo());
    }
    private void validar(PagoSolicitud d) {
        if (d == null || d.metodo() == null) throw invalido("Indica TARJETA o YAPE");
        if (d.metodo() == MetodoPago.TARJETA) {
            var t = d.tarjeta();
            if (t == null || d.yape() != null) throw invalido("Envia solo los datos de tarjeta");
            if (t.numero() == null || !t.numero().matches("[0-9]{13,19}") || !luhn(t.numero()))
                throw invalido("Numero de tarjeta invalido");
            if (t.mes() == null || t.mes() < 1 || t.mes() > 12 || t.anio() == null || t.anio() < 1 || t.anio() > 9999
                    || YearMonth.of(t.anio(), t.mes()).isBefore(YearMonth.now(ZoneId.of("America/Lima"))))
                throw invalido("Fecha de vencimiento invalida o vencida");
            if (t.cvv() == null || !t.cvv().matches("[0-9]{3,4}")) throw invalido("CVV invalido");
            if (t.titular() == null || t.titular().isBlank() || t.titular().length() > 150)
                throw invalido("Titular obligatorio, hasta 150 caracteres");
        } else {
            var y = d.yape();
            if (y == null || d.tarjeta() != null) throw invalido("Envia solo los datos de Yape");
            if (y.celular() == null || !y.celular().matches("9[0-9]{8}")) throw invalido("Celular peruano invalido");
            if (y.codigoAprobacion() == null || !y.codigoAprobacion().matches("[0-9]{6}"))
                throw invalido("El codigo de aprobacion debe tener 6 digitos");
        }
    }
    private boolean luhn(String numero) {
        int suma = 0; boolean doble = false;
        for (int i = numero.length() - 1; i >= 0; i--) {
            int n = numero.charAt(i) - '0';
            if (doble) { n *= 2; if (n > 9) n -= 9; }
            suma += n; doble = !doble;
        }
        return suma > 0 && suma % 10 == 0;
    }
    private String marca(String n) {
        if (n.startsWith("4")) return "VISA";
        if (n.startsWith("34") || n.startsWith("37")) return "AMEX";
        int prefijo = Integer.parseInt(n.substring(0, 4));
        if ((prefijo >= 5100 && prefijo <= 5599) || (prefijo >= 2221 && prefijo <= 2720)) return "MASTERCARD";
        return null;
    }
    private ResponseStatusException invalido(String mensaje) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
    }
}
