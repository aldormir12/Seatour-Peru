import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_URL } from './auth.service';

export interface Tour {
  id: number;
  nombre: string;
  descripcion: string;
  duracionMinutos: number;
  precioBase: number;
  activo: boolean;
  categoriaId: number;
  imagenUrl: string | null;
}

export interface TourCreacion {
  nombre: string;
  descripcion: string;
  duracionMinutos: number;
  precioBase: number;
  activo: boolean;
  categoriaId: number;
  imagenUrl: string | null;
}

export interface TourActualizacion {
  nombre: string;
  descripcion: string;
  duracionMinutos: number;
  precioBase: number;
  activo: boolean;
  categoriaId: number;
  imagenUrl: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class Tours {
  private readonly http = inject(HttpClient);

  subirImagen(archivo: File) {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.post<{ imagenUrl: string }>(`${API_URL}/admin/tours/imagen`, datos);
  }

  urlImagen(ruta: string): string {
    return ruta.startsWith('/api/tours/imagenes/')
      ? API_URL.replace(/\/api\/?$/, '') + ruta : ruta;
  }

  listarActivos() {
    return this.http.get<Tour[]>(
      `${API_URL}/tours`
    );
  }

  listarTodos() {
    return this.http.get<Tour[]>(
      `${API_URL}/admin/tours`
    );
  }

  crear(datos: TourCreacion) {
    return this.http.post<Tour>(
      `${API_URL}/admin/tours`,
      datos
    );
  }

  actualizar(
    id: number,
    datos: TourActualizacion
  ) {
    return this.http.put<Tour>(
      `${API_URL}/admin/tours/${id}`,
      datos
    );
  }

  cambiarEstado(
    id: number,
    activo: boolean
  ) {
    return this.http.patch<Tour>(
      `${API_URL}/admin/tours/${id}/estado`,
      { activo }
    );
  }

  eliminar(id: number) {
    return this.http.delete<void>(
      `${API_URL}/admin/tours/${id}`
    );
  }
}
