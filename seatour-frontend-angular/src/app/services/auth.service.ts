import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export type RolUsuario = 'CLIENTE' | 'OPERADOR' | 'ADMIN';

export interface LoginSolicitud {
  correo: string;
  password: string;
}

export interface LoginRespuesta {
  id: number;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  token: string;
}

export interface UsuarioSesion {
  id: number;
  nombre: string;
  correo: string;
  rol: RolUsuario;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http = inject(HttpClient);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly apiUrl =
    'http://localhost:8080/api/auth';

  private readonly tokenKey =
    'seatour_token';

  private readonly usuarioKey =
    'seatour_usuario';

  private readonly usuarioSignal =
    signal<UsuarioSesion | null>(
      this.cargarUsuario()
    );

  readonly usuario =
    this.usuarioSignal.asReadonly();

  login(
    correo: string,
    password: string
  ): Observable<LoginRespuesta> {

    const datos: LoginSolicitud = {
      correo,
      password
    };

    return this.http
      .post<LoginRespuesta>(
        `${this.apiUrl}/login`,
        datos
      )
      .pipe(
        tap(respuesta => {
          this.guardarSesion(respuesta);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(
      this.tokenKey
    );

    localStorage.removeItem(
      this.usuarioKey
    );

    this.usuarioSignal.set(null);
  }

  obtenerToken(): string | null {
    if (!this.esNavegador) return null;
    return localStorage.getItem(
      this.tokenKey
    );
  }

  estaAutenticado(): boolean {
    return this.obtenerToken() !== null;
  }

  tieneRol(
    ...roles: RolUsuario[]
  ): boolean {

    const usuario =
      this.usuarioSignal();

    if (usuario === null) {
      return false;
    }

    return roles.includes(
      usuario.rol
    );
  }

  private guardarSesion(
    respuesta: LoginRespuesta
  ): void {

    const usuario: UsuarioSesion = {
      id: respuesta.id,
      nombre: respuesta.nombre,
      correo: respuesta.correo,
      rol: respuesta.rol
    };

    localStorage.setItem(
      this.tokenKey,
      respuesta.token
    );

    localStorage.setItem(
      this.usuarioKey,
      JSON.stringify(usuario)
    );

    this.usuarioSignal.set(usuario);
  }

  private cargarUsuario():
    UsuarioSesion | null {
    if (!this.esNavegador) return null;

    const datos =
      localStorage.getItem(
        this.usuarioKey
      );

    if (datos === null) {
      return null;
    }

    try {
      const usuario =
        JSON.parse(datos) as UsuarioSesion;

      return usuario;

    } catch {
      localStorage.removeItem(
        this.usuarioKey
      );

      return null;
    }
  }
}
