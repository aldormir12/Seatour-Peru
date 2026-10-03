import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { tap } from 'rxjs';
import { API_URL } from './auth.service';
import { NotificacionesService } from './notificaciones.service';

export interface Salida {
  id: number; fecha: string; horaSalida: string; cuposDisponibles: number;
  estado: 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA';
  tourId: number; tourNombre: string; embarcacionNombre: string;
  precioPorPasajero: number; reservable: boolean;
}
export type TipoPasajero = 'NINO' | 'ADULTO' | 'ADULTO_MAYOR';
export interface CantidadesPasajeros { ninos: number; adultos: number; adultosMayores: number; }
export interface TarifaPasajero {
  tipo: TipoPasajero;
  nombre: string;
  edadMinima: number;
  edadMaxima: number | null;
  porcentajeDescuento: number;
}
export type TipoCobro = 'POR_PERSONA' | 'POR_RESERVA' | 'POR_UNIDAD';
export interface Adicional {
  id: number; nombre: string; descripcion: string; precio: number; tipoCobro: TipoCobro; activo: boolean;
}
export interface ReservaAdicional {
  adicionalId: number; nombre: string; descripcion: string; tipoCobro: TipoCobro;
  cantidad: number; precioUnitario: number; subtotal: number;
}
export interface Reserva {
  tourId?: number; estadoSalida?: 'PROGRAMADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA';
  puedeCalificar?: boolean;
  resena?: import('./resenas.service').Resena | null;
  subtotalAdicionales?: number; adicionales?: ReservaAdicional[];
  ninos: number | null; adultos: number | null; adultosMayores: number | null; totalPasajeros: number;
  id: number; clienteId: number; clienteNombre: string; salidaId: number; tourNombre: string;
  fecha: string; horaSalida: string; embarcacionNombre: string; pasajeros: number;
  precioUnitario: number; precioTotal: number; moneda: string;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';
  creadaEn: string; confirmadaEn: string | null; canceladaEn: string | null;
  cuposDisponibles: number; puedeConfirmar: boolean; puedeCancelar: boolean;
}

export function errorReserva(error: HttpErrorResponse): string {
  switch (error.status) {
    case 400: return 'Revisa la salida y la cantidad de pasajeros. Usa un número entero mayor que cero.';
    case 401: return 'Tu sesión terminó. Inicia sesión para continuar.';
    case 403: return 'No tienes permiso para realizar esta operación.';
    case 404: return 'No se encontró la reserva o salida solicitada.';
    case 409: return error.error?.detail || 'La disponibilidad o el estado cambió. Actualiza e inténtalo nuevamente.';
    default: return 'No se pudo completar la operación. Comprueba tu conexión y vuelve a intentarlo.';
  }
}

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private readonly notificaciones = inject(NotificacionesService);
  private readonly http = inject(HttpClient);
  private readonly cuposSignal = signal<Partial<Record<number, number>>>({});
  readonly cupos = this.cuposSignal.asReadonly();
  salidas(tourId?: number) {
    return this.http.get<Salida[]>(`${API_URL}/salidas${tourId ? `/tour/${tourId}` : ''}`).pipe(
      tap(salidas => this.cuposSignal.update(actual => ({ ...actual, ...Object.fromEntries(salidas.map(s => [s.id, s.cuposDisponibles])) })))
    );
  }
  salida(id: number) {
    return this.http.get<Salida>(`${API_URL}/salidas/${id}`).pipe(tap(s => this.actualizarCupos(s.id, s.cuposDisponibles)));
  }
  tarifas() { return this.http.get<TarifaPasajero[]>(`${API_URL}/reservas/tarifas`); }
  adicionalesPorTour(tourId: number) { return this.http.get<Adicional[]>(`${API_URL}/tours/${tourId}/adicionales`); }
  crear(salidaId: number, cantidades: CantidadesPasajeros, precioEsperado: number, adicionalesIds: number[] = []) {
    return this.http.post<Reserva>(`${API_URL}/reservas`, { salidaId, ...cantidades, precioEsperado, adicionalesIds }).pipe(
      tap(r => {
        this.actualizar(r);
        this.notificaciones.solicitarRefrescoContador(r.clienteId);
      })
    );
  }
  listar(gestion = false) { return this.http.get<Reserva[]>(`${API_URL}/reservas${gestion ? '' : '/mis-reservas'}`); }
  consultar(id: number) { return this.http.get<Reserva>(`${API_URL}/reservas/${id}`).pipe(tap(r => this.actualizar(r))); }
  confirmar(id: number) { return this.http.post<Reserva>(`${API_URL}/reservas/${id}/confirmar`, {}).pipe(tap(r => this.actualizar(r))); }
  cancelar(id: number) { return this.http.post<Reserva>(`${API_URL}/reservas/${id}/cancelar`, {}).pipe(tap(r => this.actualizar(r))); }
  private actualizar(r: Reserva) { this.actualizarCupos(r.salidaId, r.cuposDisponibles); }
  private actualizarCupos(id: number, cupos: number) { this.cuposSignal.update(actual => ({ ...actual, [id]: cupos })); }
}
