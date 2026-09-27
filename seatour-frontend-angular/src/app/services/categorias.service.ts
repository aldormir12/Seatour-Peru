import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_URL } from './auth.service';

export interface CategoriaTour {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface CategoriaCreacion {
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface CategoriaActualizacion {
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriasService {
  private readonly http = inject(HttpClient);

  listarActivas() {
    return this.http.get<CategoriaTour[]>(
      `${API_URL}/categorias`
    );
  }

  listarTodas() {
    return this.http.get<CategoriaTour[]>(
      `${API_URL}/admin/categorias`
    );
  }

  crear(datos: CategoriaCreacion) {
    return this.http.post<CategoriaTour>(
      `${API_URL}/admin/categorias`,
      datos
    );
  }

  actualizar(
    id: number,
    datos: CategoriaActualizacion
  ) {
    return this.http.put<CategoriaTour>(
      `${API_URL}/admin/categorias/${id}`,
      datos
    );
  }

  cambiarEstado(
    id: number,
    activo: boolean
  ) {
    return this.http.patch<CategoriaTour>(
      `${API_URL}/admin/categorias/${id}/estado`,
      { activo }
    );
  }

  eliminar(id: number) {
    return this.http.delete<void>(
      `${API_URL}/admin/categorias/${id}`
    );
  }
}
