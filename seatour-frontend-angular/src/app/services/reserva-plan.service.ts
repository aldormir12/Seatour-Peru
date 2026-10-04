import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';
import { API_URL } from './auth.service';
import { CantidadesPasajeros, Reserva, ReservaAdicional, ReservasService } from './reservas.service';
import { MetodoPago, PagoTarjetaSolicitud, PagoYapeSolicitud } from './pagos.service';

export interface PlanSeleccion {
  composicion: CantidadesPasajeros;
  adicionalesIds?: number[];
  subtotalAdicionalesEsperado?: number;
  items: { salidaId: number; precioEsperado?: number }[];
}
export interface PlanResumen {
  items: { salidaId: number; tourNombre: string; cuposDisponibles: number; subtotal: number; problema: string | null }[];
  total: number;
  disponible: boolean;
  adicionales: ReservaAdicional[];
  subtotalAdicionales: number;
}
export interface PlanPagoSolicitud {
  operacionId: string;
  seleccion: PlanSeleccion;
  pago: { metodo: MetodoPago; tarjeta?: PagoTarjetaSolicitud; yape?: PagoYapeSolicitud };
}
export interface PlanPagoRespuesta {
  estadoPago: 'APROBADO' | 'RECHAZADO';
  mensaje: string;
  reservas: Reserva[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ReservaPlanService {
  private readonly http = inject(HttpClient);
  private readonly reservas = inject(ReservasService);
  private readonly url = `${API_URL}/intelligence/plan-dia/reserva`;

  resumen(seleccion: PlanSeleccion) {
    return this.http.post<PlanResumen>(`${this.url}/resumen`, seleccion);
  }
  pagar(datos: PlanPagoSolicitud) {
    return this.http.post<PlanPagoRespuesta>(`${this.url}/pagar`, datos).pipe(tap(resultado => {
      this.reservas.registrarPlan(resultado.reservas);
    }));
  }
}
