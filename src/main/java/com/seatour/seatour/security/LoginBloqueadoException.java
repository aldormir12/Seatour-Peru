package com.seatour.seatour.security;

import org.springframework.security.core.AuthenticationException;

public class LoginBloqueadoException extends AuthenticationException {
    public LoginBloqueadoException() {
        super("Inicio de sesión temporalmente bloqueado. Espera 15 minutos antes de volver a intentarlo.");
    }
}
