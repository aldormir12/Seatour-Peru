import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map } from 'rxjs';

import { API_URL } from './auth.service';
import { CategoriaTour, CategoriasService } from './categorias.service';

export type ZonaMaritimaTour = 'MANCORA' | 'LOS_ORGANOS' | 'CABO_BLANCO' | 'TALARA';

export interface Tour {
  zonaMaritima: ZonaMaritimaTour | null;
  id: number;
  nombre: string;
  descripcion: string;
  duracionMinutos: number;
  precioBase: number;
  activo: boolean;
  categoriaId: number;
  imagenUrl: string | null;
}

export interface TourDestacado extends Tour {
  categoria: CategoriaTour | null;
}

export interface TourCreacion {
  zonaMaritima: ZonaMaritimaTour;
  nombre: string;
  descripcion: string;
  duracionMinutos: number;
  precioBase: number;
  activo: boolean;
  categoriaId: number;
  imagenUrl: string | null;
}

export interface TourActualizacion {
  zonaMaritima: ZonaMaritimaTour;
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
  private readonly categorias = inject(CategoriasService);

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

  // Selección inicial: hasta tres activos, conservando el orden por nombre del backend.
  listarDestacados() {
    return forkJoin({
      tours: this.listarActivos(),
      categorias: this.categorias.listarActivas()
    }).pipe(map(({ tours, categorias }): TourDestacado[] => {
      const porId = new Map(categorias.map(categoria => [categoria.id, categoria]));
      return tours.filter(tour => tour.activo).slice(0, 3).map(tour => ({
        ...tour,
        categoria: porId.get(tour.categoriaId) ?? null
      }));
    }));
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
