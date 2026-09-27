package com.seatour.seatour.controller;

import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrores {
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ProblemDetail imagenDemasiadoGrande() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.PAYLOAD_TOO_LARGE,
                "La imagen no puede superar los 5 MB");
    }

    @ExceptionHandler({org.springframework.web.multipart.MultipartException.class,
            org.springframework.web.multipart.support.MissingServletRequestPartException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class})
    public ProblemDetail archivoInvalido() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Envia una imagen en el campo multipart archivo");
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ProblemDetail parametroInvalido() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Parametro invalido");
    }

    @ExceptionHandler(org.springframework.dao.PessimisticLockingFailureException.class)
    public ProblemDetail concurrencia() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "La disponibilidad esta siendo actualizada. Consulta los cupos e intenta nuevamente");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail estado(ResponseStatusException error) {

        String detalle = error.getReason() != null
                ? error.getReason()
                : "Ocurrió un error al procesar la solicitud";

        return ProblemDetail.forStatusAndDetail(
                error.getStatusCode(),
                detalle);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validacionDto(
            MethodArgumentNotValidException error) {

        String detalle = error.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(fieldError -> fieldError.getDefaultMessage())
                .orElse("Los datos enviados no son válidos");

        return ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                detalle);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail validacionRestricciones(
            ConstraintViolationException error) {

        return ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Los datos enviados no cumplen las validaciones requeridas");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail jsonInvalido(
            HttpMessageNotReadableException error) {

        return ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "El cuerpo de la solicitud contiene datos inválidos o tiene un formato incorrecto");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail argumentoInvalido(
            IllegalArgumentException error) {

        return ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                error.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail conflictoDatos(
            DataIntegrityViolationException error) {

        return ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT,
                "La operación no pudo completarse por un conflicto con los datos existentes");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail errorInterno(
            Exception error) {

        return ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Ocurrió un error interno al procesar la solicitud");
    }
}
