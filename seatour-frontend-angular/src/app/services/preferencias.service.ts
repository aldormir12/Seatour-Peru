import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './auth.service';


export interface CategoriaPreferencia {
  id: number;
  nombre: string;
}


export interface PreferenciasCliente {
  preferenciasConfiguradas: boolean;

  categoriasFavoritas: number[];

  presupuestoMaximo: number | null;

  horarioPreferido: string[];

  duracionPreferidaMinutos: number | null;

  nivelActividad: string | null;

  tipoGrupo: string | null;

  prioridades: string[];

  restricciones: string[];
}


export interface ActualizarPreferenciasCliente {
  categoriasFavoritas: number[];

  presupuestoMaximo: number | null;

  horarioPreferido: string[];

  duracionPreferidaMinutos: number | null;

  nivelActividad: string | null;

  tipoGrupo: string | null;

  prioridades: string[];

  restricciones: string[];
}


@Injectable({
  providedIn: 'root'
})
export class PreferenciasService {

  private readonly http =
    inject(HttpClient);


  obtener(): Observable<PreferenciasCliente> {

    return this.http.get<PreferenciasCliente>(
      `${API_URL}/usuarios/me/preferencias`
    );
  }


  guardar(
    preferencias: ActualizarPreferenciasCliente
  ): Observable<PreferenciasCliente> {

    return this.http.put<PreferenciasCliente>(
      `${API_URL}/usuarios/me/preferencias`,
      preferencias
    );
  }


  listarCategorias():
    Observable<CategoriaPreferencia[]> {

    return this.http.get<CategoriaPreferencia[]>(
      `${API_URL}/categorias`
    );
  }

}
