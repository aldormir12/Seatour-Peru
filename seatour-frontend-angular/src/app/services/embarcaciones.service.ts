import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './auth.service';

export interface Embarcacion {
  id: number;
  nombre: string;
  matricula: string;
  tipo: string;
  capacidad: number;
  activo: boolean;
  imagenUrl: string;
}

export interface EmbarcacionPublica {
  id: number;
  nombre: string;
  tipo: string | null;
  capacidad: number;
  imagenUrl: string | null;
}

export interface EmbarcacionSolicitud {
  nombre: string;
  matricula: string;
  tipo: string;
  capacidad: number;
  activo: boolean;
  imagenUrl: string;
}

export interface EmbarcacionEstado {
  activo: boolean;
}

export interface ImagenEmbarcacionRespuesta {
  imagenUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmbarcacionesService {

  private readonly apiBase =
    API_URL.replace(/\/$/, '');

  private readonly apiAdmin =
    `${this.apiBase}/admin/embarcaciones`;

  private readonly apiPublica =
    `${this.apiBase}/embarcaciones`;

  constructor(
    private readonly http: HttpClient
  ) {}


  // =========================================================
  // ADMIN
  // =========================================================

  listar(): Observable<Embarcacion[]> {
    return this.http.get<Embarcacion[]>(
      this.apiAdmin
    );
  }

  crear(
    datos: EmbarcacionSolicitud
  ): Observable<Embarcacion> {

    return this.http.post<Embarcacion>(
      this.apiAdmin,
      datos
    );
  }

  actualizar(
    id: number,
    datos: EmbarcacionSolicitud
  ): Observable<Embarcacion> {

    return this.http.put<Embarcacion>(
      `${this.apiAdmin}/${id}`,
      datos
    );
  }

  cambiarEstado(
    id: number,
    activo: boolean
  ): Observable<Embarcacion> {

    return this.http.patch<Embarcacion>(
      `${this.apiAdmin}/${id}/estado`,
      { activo }
    );
  }

  eliminar(
    id: number
  ): Observable<void> {

    return this.http.delete<void>(
      `${this.apiAdmin}/${id}`
    );
  }

  subirImagen(
    archivo: File
  ): Observable<ImagenEmbarcacionRespuesta> {

    const formData = new FormData();

    formData.append(
      'archivo',
      archivo
    );

    return this.http.post<ImagenEmbarcacionRespuesta>(
      `${this.apiAdmin}/imagen`,
      formData
    );
  }


  // =========================================================
  // CLIENTE
  // =========================================================

  obtenerPublicaPorId(
    id: number
  ): Observable<EmbarcacionPublica> {

    return this.http.get<EmbarcacionPublica>(
      `${this.apiPublica}/${id}`
    );
  }


  // =========================================================
  // IMÁGENES
  // =========================================================

  resolverImagen(
    imagenUrl: string | null | undefined
  ): string {

    if (!imagenUrl) {
      return '';
    }

    if (
      imagenUrl.startsWith('http://') ||
      imagenUrl.startsWith('https://')
    ) {
      return imagenUrl;
    }

    const host =
      API_URL.replace(/\/api\/?$/, '');

    return `${host}${
      imagenUrl.startsWith('/')
        ? ''
        : '/'
    }${imagenUrl}`;
  }

  obtenerImagen(
    imagenUrl: string
  ): Observable<Blob> {

    return this.http.get(
      this.resolverImagen(imagenUrl),
      {
        responseType: 'blob'
      }
    );
  }
}