import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_URL } from './auth.service';

export interface Desviacion {
  salidasEvaluables: number;
  salidasSinDatosEvaluables: number;
  desviacionMediaMinutos: number | null;
  errorAbsolutoMedioMinutos: number | null;
}

export interface DemandaTour {
  tourId: number;
  tourNombre: string;
  reservas: number;
  pasajeros: number;
}

export interface IngresoTour {
  tourId: number;
  tourNombre: string;
  ingresosRegistrados: number;
}

export interface AdicionalVendido {
  adicionalId: number;
  nombre: string;
  tipoCobro: string;
  cantidad: number;
  importeRegistrado: number;
}

export interface DashboardAdminRespuesta {
  desde: string;
  hasta: string;
  zonaHoraria: string;
  moneda: string;
  ingresosRegistrados: number;
  pagosAprobados: number;
  ocupacionPromedioPorcentaje: number | null;
  salidasConOcupacion: number;
  salidasSinOcupacionCalculable: number;
  puntualidadInicio: Desviacion;
  puntualidadCierre: Desviacion;
  demandaPorTour: DemandaTour[];
  ingresosPorTour: IngresoTour[];
  toursMayorDemanda: DemandaTour[];
  adicionalesMasVendidos: AdicionalVendido[];
  criterios: string[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_URL}/admin/dashboard`;

  /** Fechas opcionales en formato YYYY-MM-DD. */
  obtener(desde?: string, hasta?: string): Observable<DashboardAdminRespuesta> {
    let params = new HttpParams();
    if (desde !== undefined) params = params.set('desde', desde);
    if (hasta !== undefined) params = params.set('hasta', hasta);
    return this.http.get<DashboardAdminRespuesta>(this.apiUrl, { params });
  }
}
