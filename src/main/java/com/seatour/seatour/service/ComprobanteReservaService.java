package com.seatour.seatour.service;

import com.seatour.seatour.model.*;
import com.seatour.seatour.repository.ComprobanteReservaRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.util.HtmlUtils;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ComprobanteReservaService {
    private final ComprobanteReservaRepository comprobantes;
    public ComprobanteReservaService(ComprobanteReservaRepository comprobantes) { this.comprobantes = comprobantes; }

    @Transactional(propagation = Propagation.MANDATORY)
    public void preparar(Reserva r) {
        if (r.getEstado() != EstadoReserva.CONFIRMADA) throw new IllegalStateException("Reserva no confirmada");
        if (comprobantes.existsByReservaId(r.getId())) return;
        String codigo = "ST-" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT);
        var salida = r.getSalida();
        Map<String, String> datos = new LinkedHashMap<>();
        datos.put("Tour", salida.getTour().getNombre());
        datos.put("Fecha", salida.getFecha().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        datos.put("Hora (Perú)", salida.getHoraSalida().format(DateTimeFormatter.ofPattern("HH:mm")));
        datos.put("Embarcación", salida.getEmbarcacion().getNombre());
        datos.put("Pasajeros", Integer.toString(r.getPasajeros()));
        if (r.getNinos() != null) datos.put("Distribución", "Niños: " + r.getNinos() + " | Adultos: "
                + r.getAdultos() + " | Adultos mayores: " + r.getAdultosMayores());
        String adicionales = r.getAdicionales().isEmpty() ? "Sin adicionales" : r.getAdicionales().stream()
                .map(a -> a.getNombre() + " (" + a.getCantidad() + ") - " + dinero(a.getSubtotal()))
                .collect(java.util.stream.Collectors.joining("; "));
        datos.put("Adicionales", adicionales);
        datos.put("Total pagado", dinero(r.getPrecioTotal()));
        datos.put("Código de reserva", codigo);
        StringBuilder texto = new StringBuilder("SEATOUR - Reserva confirmada\n\n");
        StringBuilder filas = new StringBuilder();
        datos.forEach((k, v) -> {
            texto.append(k).append(": ").append(v).append("\n");
            filas.append("<tr><th align='left' style='padding:12px;border-bottom:1px solid #e2e8f0;color:#526577;font-weight:normal'>")
                    .append(HtmlUtils.htmlEscape(k)).append("</th><td style='padding:12px;border-bottom:1px solid #e2e8f0;overflow-wrap:anywhere'>")
                    .append(HtmlUtils.htmlEscape(v)).append("</td></tr>");
        });
        texto.append("\nPresenta el QR adjunto al embarcar. Conserva este correo como comprobante de tu reserva.");
        String html = """
                <!doctype html><html lang="es"><head><meta charset="UTF-8"></head>
                <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#102d41">
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
                <table role="presentation" width="100%%" style="max-width:620px;background:white;border-radius:16px" cellpadding="0" cellspacing="0">
                <tr><td style="padding:28px;background:#102d41;color:white"><strong style="font-size:22px;letter-spacing:3px">SEATOUR</strong></td></tr>
                <tr><td style="padding:28px"><h1 style="font-size:24px;margin-top:0">Tu reserva está confirmada</h1>
                <p style="color:#526577;line-height:1.6">Recibimos tu pago. Estos son los detalles de tu próxima experiencia en el mar.</p>
                <table width="100%%" cellspacing="0" style="font-size:14px">%s</table>
                <div style="text-align:center;padding:24px 0"><img src="cid:reserva-qr" width="256" height="256" alt="QR de tu reserva">
                <p style="font-weight:bold">Presenta este QR al embarcar.</p>
                <p style="font-size:13px;color:#526577">Conserva este correo y evita compartir tu código de reserva.</p></div>
                </td></tr></table></td></tr></table></body></html>
                """.formatted(filas);
        comprobantes.save(new ComprobanteReserva(r, codigo, texto.toString(), html, qr(codigo)));
    }
    private String dinero(BigDecimal monto) { return "S/ " + monto.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString(); }
    private byte[] qr(String codigo) {
        try {
            var matriz = new QRCodeWriter().encode("SEATOUR:RESERVA:v1:" + codigo, BarcodeFormat.QR_CODE, 320, 320,
                    Map.of(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M, EncodeHintType.MARGIN, 4));
            var imagen = new BufferedImage(320, 320, BufferedImage.TYPE_INT_RGB);
            for (int y = 0; y < 320; y++) for (int x = 0; x < 320; x++)
                imagen.setRGB(x, y, matriz.get(x, y) ? 0x000000 : 0xFFFFFF);
            var salida = new ByteArrayOutputStream();
            if (!ImageIO.write(imagen, "png", salida)) throw new IllegalStateException("PNG no disponible");
            return salida.toByteArray();
        } catch (Exception e) { throw new IllegalStateException("No se pudo generar el comprobante QR", e); }
    }
}
