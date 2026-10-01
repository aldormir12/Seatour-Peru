import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from './auth.service';

export type MetodoPago = 'TARJETA' | 'YAPE';
export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface PagoRespuesta {
  pagoId: number;
  reservaId: number;
  metodo: MetodoPago;
  estadoPago: EstadoPago;
  estadoReserva: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';
  monto: number;
  referencia: string;
  mensaje: string;
  motivoRechazo: string | null;
}

export interface PagoTarjetaSolicitud {
  numero: string;
  mes: number;
  anio: number;
  cvv: string;
  titular: string;
}

export interface PagoYapeSolicitud {
  celular: string;
  codigoAprobacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class PagosService {
  private readonly http = inject(HttpClient);

  pagarConTarjeta(
    reservaId: number,
    tarjeta: PagoTarjetaSolicitud
  ) {
    return this.http.post<PagoRespuesta>(
      `${API_URL}/reservas/${reservaId}/pagos`,
      {
        metodo: 'TARJETA',
        tarjeta
      }
    );
  }

  pagarConYape(
    reservaId: number,
    yape: PagoYapeSolicitud
  ) {
    return this.http.post<PagoRespuesta>(
      `${API_URL}/reservas/${reservaId}/pagos`,
      {
        metodo: 'YAPE',
        yape
      }
    );
  }
}