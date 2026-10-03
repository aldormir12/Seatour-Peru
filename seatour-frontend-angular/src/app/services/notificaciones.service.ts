import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './auth.service';
import { Subject } from 'rxjs';

export interface Notificacion {
  id: number; tipo: string; titulo: string; mensaje: string;
  creadaEn: string; leida: boolean; leidaEn: string | null;
}
export interface NotificacionesPagina {
  notificaciones: Notificacion[]; pagina: number; tamanio: number;
  totalElementos: number; totalPaginas: number;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly cambiosContador = new Subject<number>();
  readonly refrescosContador = this.cambiosContador.asObservable();

  solicitarRefrescoContador(usuarioId: number): void {
    this.cambiosContador.next(usuarioId);
  }

  private readonly url = API_URL + '/notificaciones';
  listar(pagina = 0, tamanio = 20) {
    return this.http.get<NotificacionesPagina>(this.url, { params: { pagina, tamanio } });
  }
  contarNoLeidas() { return this.http.get<{ noLeidas: number }>(this.url + '/no-leidas/contador'); }
  marcarLeida(id: number) { return this.http.patch<Notificacion>(this.url + '/' + id + '/leida', {}); }
  marcarTodasLeidas() { return this.http.patch<void>(this.url + '/leidas', {}); }
}
