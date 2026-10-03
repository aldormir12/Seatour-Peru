import { Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_URL, AuthService } from './auth.service';
export interface Resena { id: number; tourId: number; puntuacion: number; comentario: string | null; creadaEn: string; }
export interface ResenasTour { tourId: number; promedio: number | null; cantidad: number; resenas: Resena[]; }
@Injectable({ providedIn: 'root' })
export class ResenasService {
  private readonly http = inject(HttpClient);
  readonly resumenes = signal<Record<number, ResenasTour>>({});
  readonly propias = signal<Record<number, Resena>>({});
  private readonly auth = inject(AuthService);
  constructor() {
    effect(() => {
      this.auth.usuario();
      this.propias.set({});
      this.resumenes.set({});
    });
  }
  listar(tourId: number) {
    return this.http.get<ResenasTour>(API_URL + '/tours/' + tourId + '/resenas').pipe(
      tap(datos => this.resumenes.update(actual => ({ ...actual, [tourId]: datos })))
    );
  }
  crear(reservaId: number, puntuacion: number, comentario: string) {
    return this.http.post<Resena>(API_URL + '/reservas/' + reservaId + '/resena',
      { puntuacion, comentario: comentario.trim() || null }).pipe(
        tap(resena => this.propias.update(actual => ({ ...actual, [reservaId]: resena })))
      );
  }
}
