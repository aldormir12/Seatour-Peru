import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { API_URL } from './auth.service';
import type { RolUsuario } from './auth.service';


export interface UsuarioAdministrable {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
}


export interface CrearOperadorSolicitud {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
}


export interface CambiarEstadoUsuarioSolicitud {
  activo: boolean;
}

export type EditarOperadorSolicitud = Omit<CrearOperadorSolicitud, 'password'>;


@Injectable({
  providedIn: 'root'
})
export class UsuariosService {

  editarOperador(id: number, datos: EditarOperadorSolicitud): Observable<UsuarioAdministrable> {
    return this.http.put<UsuarioAdministrable>(`${this.apiUrl}/operadores/${id}`, datos);
  }

  restablecerPasswordOperador(id: number, password: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/operadores/${id}/password`, { password });
  }

  private readonly apiUrl =
    `${API_URL}/usuarios`;


  constructor(
    private readonly http: HttpClient
  ) {}


  listar():
    Observable<UsuarioAdministrable[]> {

    return this.http.get<
      UsuarioAdministrable[]
    >(this.apiUrl);
  }


  crearOperador(
    datos: CrearOperadorSolicitud
  ): Observable<UsuarioAdministrable> {

    return this.http.post<
      UsuarioAdministrable
    >(
      `${this.apiUrl}/operadores`,
      datos
    );
  }


  cambiarEstado(
    id: number,
    activo: boolean
  ): Observable<UsuarioAdministrable> {

    const datos:
      CambiarEstadoUsuarioSolicitud = {
        activo
      };

    return this.http.patch<
      UsuarioAdministrable
    >(
      `${this.apiUrl}/${id}/estado`,
      datos
    );
  }
}
