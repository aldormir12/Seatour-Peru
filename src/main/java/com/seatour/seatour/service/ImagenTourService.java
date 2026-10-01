package com.seatour.seatour.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.PathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.nio.file.*;
import java.util.Locale;
import java.util.UUID;

@Service
public class ImagenTourService {
    private static final long MAXIMO = 5 * 1024 * 1024;
    private final Path directorio;

    public ImagenTourService(@Value("${seatour.imagenes.directorio:./uploads/tours}") String ruta) {
        directorio = Path.of(ruta).toAbsolutePath().normalize();
    }

    public String guardar(MultipartFile archivo) {
        if (archivo.isEmpty()) throw invalido("Selecciona una imagen no vacia");
        if (archivo.getSize() > MAXIMO) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "La imagen no puede superar los 5 MB");
        }
        String nombre = archivo.getOriginalFilename();
        String extension = nombre == null ? "" : nombre.substring(nombre.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (!java.util.Set.of("jpg", "jpeg", "png", "webp").contains(extension)) {
            throw invalido("Solo se permiten imagenes JPG, JPEG, PNG o WEBP");
        }
        try {
            byte[] datos = archivo.getBytes();
            boolean png = datos.length > 24 && datos[0] == (byte)137
                    && datos[1] == 80 && datos[2] == 78 && datos[3] == 71
                    && datos[4] == 13 && datos[5] == 10 && datos[6] == 26 && datos[7] == 10;
            boolean jpg = datos.length > 4 && datos[0] == (byte)255 && datos[1] == (byte)216 && datos[2] == (byte)255;
            boolean webp = datos.length > 20 && texto(datos, 0, 4).equals("RIFF")
                    && texto(datos, 8, 4).equals("WEBP")
                    && java.util.Set.of("VP8 ", "VP8L", "VP8X").contains(texto(datos, 12, 4))
                    && Integer.toUnsignedLong(java.nio.ByteBuffer.wrap(datos, 4, 4)
                        .order(java.nio.ByteOrder.LITTLE_ENDIAN).getInt()) == datos.length - 8L;
            boolean coincide = extension.equals("png") ? png : extension.equals("webp") ? webp : jpg;
            if (!coincide) throw invalido("El contenido del archivo no corresponde a una imagen valida del formato indicado");
            if (!webp) {
                try (var entrada = javax.imageio.ImageIO.createImageInputStream(new java.io.ByteArrayInputStream(datos))) {
                    var lectores = javax.imageio.ImageIO.getImageReaders(entrada);
                    if (!lectores.hasNext()) throw invalido("La imagen esta dañada");
                    var lector = lectores.next();
                    try {
                        lector.setInput(entrada);
                        if ((long) lector.getWidth(0) * lector.getHeight(0) > 40_000_000L) {
                            throw invalido("La imagen supera los 40 megapixeles");
                        }
                        lector.read(0);
                    } finally { lector.dispose(); }
                } catch (IOException error) { throw invalido("La imagen esta dañada"); }
            }
            Files.createDirectories(directorio);
            String generado = UUID.randomUUID() + "." + (extension.equals("jpeg") ? "jpg" : extension);
            Files.write(directorio.resolve(generado), datos, StandardOpenOption.CREATE_NEW);
            return urlPublica(generado);
        } catch (IOException error) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar la imagen");
        }
    }

    public static String urlPublica(String imagenUrl) {
        if (imagenUrl == null || imagenUrl.isBlank() || imagenUrl.contains("/")) return imagenUrl;
        return "/api/tours/imagenes/" + imagenUrl;
    }

    public Resource leer(String nombre) {
        if (!nombre.matches("[a-f0-9-]{36}\\.(jpg|png|webp)")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagen no encontrada");
        }
        Path archivo = directorio.resolve(nombre).normalize();
        if (!archivo.startsWith(directorio) || !Files.isRegularFile(archivo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Imagen no encontrada");
        }
        return new PathResource(archivo);
    }

    private static String texto(byte[] datos, int inicio, int longitud) {
        return new String(datos, inicio, longitud, java.nio.charset.StandardCharsets.US_ASCII);
    }

    private static ResponseStatusException invalido(String mensaje) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
    }
}
