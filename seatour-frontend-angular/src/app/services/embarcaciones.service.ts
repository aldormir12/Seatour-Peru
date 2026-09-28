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

  private readonly apiUrl = 'http://localhost:8080/api/admin/embarcaciones';

  constructor(private http: HttpClient) {}

  listar(): Observable<Embarcacion[]> {
    return this.http.get<Embarcacion[]>(this.apiUrl);
  }

  crear(datos: EmbarcacionSolicitud): Observable<Embarcacion> {
    return this.http.post<Embarcacion>(this.apiUrl, datos);
  }

  actualizar(
    id: number,
    datos: EmbarcacionSolicitud
  ): Observable<Embarcacion> {
    return this.http.put<Embarcacion>(
      `${this.apiUrl}/${id}`,
      datos
    );
  }

  cambiarEstado(
    id: number,
    activo: boolean
  ): Observable<Embarcacion> {
    return this.http.patch<Embarcacion>(
      `${this.apiUrl}/${id}/estado`,
      { activo }
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }

  subirImagen(archivo: File): Observable<ImagenEmbarcacionRespuesta> {
    const formData = new FormData();
    formData.append('archivo', archivo);

    return this.http.post<ImagenEmbarcacionRespuesta>(
      `${this.apiUrl}/imagen`,
      formData
    );
  }

  resolverImagen(imagenUrl: string | null | undefined): string {
    if (!imagenUrl) {
      return '';
    }

    if (
      imagenUrl.startsWith('http://') ||
      imagenUrl.startsWith('https://')
    ) {
      return imagenUrl;
    }

    return `${API_URL.replace(/\/api\/?$/, '')}${imagenUrl.startsWith('/') ? '' : '/'}${imagenUrl}`;
  }

  obtenerImagen(imagenUrl: string): Observable<Blob> {
    return this.http.get(this.resolverImagen(imagenUrl), { responseType: 'blob' });
  }
}
