import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, switchMap, tap, throwError, timeout } from 'rxjs';

export type RolUsuario = 'CLIENTE' | 'OPERADOR' | 'ADMIN';
export interface LoginSolicitud { correo: string; password: string; }
export interface UsuarioSesion { id: number; nombre: string; correo: string; rol: RolUsuario; }
export interface LoginRespuesta extends UsuarioSesion { token: string; }
export interface RegistroSolicitud extends LoginSolicitud { nombre: string; apellido: string; }
export class LoginTrasRegistroError extends Error {}
export const API_URL = 'http://localhost:8080/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly usuarioSignal = signal<UsuarioSesion | null>(null);
  readonly usuario = this.usuarioSignal.asReadonly();
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
  }

  login(correo: string, password: string): Observable<LoginRespuesta> {
    return this.http.post<LoginRespuesta>(`${API_URL}/auth/login`, {
      correo: correo.trim().toLowerCase(), password
    }).pipe(tap(respuesta => this.guardarSesion(respuesta)));
  }

  registrar(datos: RegistroSolicitud): Observable<LoginRespuesta> {
    const solicitud = { nombre: datos.nombre.trim(), apellido: datos.apellido.trim(),
      correo: datos.correo.trim().toLowerCase(), password: datos.password };
    return this.http.post(`${API_URL}/usuarios`, solicitud).pipe(
      switchMap(() => this.login(solicitud.correo, solicitud.password).pipe(
        catchError(() => throwError(() => new LoginTrasRegistroError()))
      ))
    );
  }

  restaurarSesion(): Observable<unknown> {
    const token = this.obtenerToken();
    if (!token) return of(null);
    // La firma y el usuario vigente se comprueban siempre en el backend.
    return this.http.get<UsuarioSesion>(`${API_URL}/auth/me`).pipe(
      timeout(10000),
      tap(usuario => {
        if (this.obtenerToken() === token) this.guardarSesion({ ...usuario, token });
      }),
      catchError(() => { this.logout(); return of(null); })
    );
  }

  logout(): void {
    clearTimeout(this.temporizador);
    if (this.esNavegador) {
      localStorage.removeItem('seatour_token');
      localStorage.removeItem('seatour_usuario');
    }
    this.usuarioSignal.set(null);
  }

  obtenerToken(): string | null {
    if (!this.esNavegador) return null;
    const token = localStorage.getItem('seatour_token');
    if (!token || !this.expiracion(token)) { this.logout(); return null; }
    return token;
  }

  estaAutenticado(): boolean {
    // Consulta pura: tambien se usa al renderizar enlaces segun el rol.
    return this.esNavegador && this.usuario() !== null
      && this.expiracion(localStorage.getItem('seatour_token') ?? '') !== null;
  }
  tieneRol(...roles: RolUsuario[]): boolean {
    return this.estaAutenticado() && roles.includes(this.usuario()!.rol);
  }

  private expiracion(token: string): number | null {
    try {
      const partes = token.split('.');
      if (partes.length !== 3 || partes.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) return null;
      const payload = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const { exp } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
      return typeof exp === 'number' && Number.isFinite(exp) && exp * 1000 > Date.now()
        ? exp * 1000 : null;
    } catch { return null; }
  }

  private guardarSesion(respuesta: LoginRespuesta): void {
    const expiracion = this.expiracion(respuesta.token);
    if (!expiracion) { this.logout(); throw new Error('JWT inválido o expirado'); }
    const { id, nombre, correo, rol } = respuesta;
    const usuario = { id, nombre, correo, rol };
    if (this.esNavegador) {
      localStorage.setItem('seatour_token', respuesta.token);
      localStorage.setItem('seatour_usuario', JSON.stringify(usuario));
      clearTimeout(this.temporizador);
      this.temporizador = setTimeout(() => this.logout(), Math.min(expiracion - Date.now(), 2147483647));
    }
    this.usuarioSignal.set(usuario);
  }
}
