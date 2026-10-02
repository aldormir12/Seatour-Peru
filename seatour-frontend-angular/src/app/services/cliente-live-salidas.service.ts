import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './auth.service';

export interface LiveSalida {
  esDemo: boolean;
  id: number;
  tour: { id: number; nombre: string };
  imagenUrl: string | null;
  zonaMaritima: string | null;
  embarcacion: { id: number; nombre: string };
  operador: { id: number; nombre: string } | null;
  inicioReal: string | null;
  cuposDisponibles: number | null;
}

@Injectable({ providedIn: 'root' })
export class ClienteLiveSalidasService {
  private readonly http = inject(HttpClient);

  listar() {
    return this.http.get<LiveSalida[]>(`${API_URL}/live/salidas`);
  }
}
