package com.seatour.seatour.controller;

import com.seatour.seatour.service.ImagenTourService;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
public class ImagenTourController {
    private final ImagenTourService imagenes;
    public ImagenTourController(ImagenTourService imagenes) { this.imagenes = imagenes; }

    @PostMapping(value = "/api/admin/tours/imagen", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> subir(@RequestParam("archivo") MultipartFile archivo) {
        return Map.of("imagenUrl", imagenes.guardar(archivo));
    }

    @GetMapping("/api/tours/imagenes/{nombre}")
    public ResponseEntity<Resource> mostrar(@PathVariable String nombre) {
        Resource recurso = imagenes.leer(nombre);
        String tipo = nombre.endsWith(".png") ? "image/png" : nombre.endsWith(".webp") ? "image/webp" : "image/jpeg";
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(tipo)).body(recurso);
    }
}
