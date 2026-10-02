import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './auth.service';
import { ZonaMaritimaTour } from './tours';

export interface RecomendacionIntelligence {
  tourId: number;
  tourNombre: string;
  score: number;
  mejorSalidaId: number | null;
  mejorHora: string | null;
  razones: string[];
}

export interface PlanDiaItem {
  tourId: number;
  tourNombre: string;
  salidaId: number;
  horaInicio: string;
  horaFin: string;
  duracionMinutos: number;
  score: number;
  precioBase: number;
  imagenUrl: string | null;
}

export interface PlanDiaRespuesta {
  items: PlanDiaItem[];
  precioTotalPorPersona: number;
  duracionExperienciasMinutos: number;
  horaInicioPlan: string | null;
  horaFinPlan: string | null;
}
export interface AfinidadIntelligence {
  tourId: number;
  score: number;
  nivel: 'IDEAL' | 'ALTA' | 'BUENA' | 'BAJA' | 'MUY_BAJA';
}

export interface MejorOpcionVentana {
  inicio: string;
  fin: string;
}

export interface MejorOpcionTourSalida {
  tourId: number;
  nombre: string;
  salidaId: number;
  scoreAfinidad: number;
  imagenUrl: string | null;
}

export interface MejorOpcionCondiciones {
  estado: 'COMPLETO' | 'PARCIAL' | 'NO_DISPONIBLE';
  oleajeMaximoMetros: number | null;
  vientoMaximoKmh: number | null;
  visibilidadMinimaMetros: number | null;
}

export interface MejorOpcionDisponibilidad {
  disponible: boolean;
  cuposDisponibles: number;
}

export interface MejorOpcionRespuesta {
  fecha: string;
  fechaSalida?: string | null;
  esProximaRecomendacion?: boolean;
  estado: 'RECOMENDACION_DISPONIBLE' | 'SIN_SALIDAS';
  mejorZona: ZonaMaritimaTour | null;
  mejorVentanaHoraria: MejorOpcionVentana | null;
  mejorTourSalida: MejorOpcionTourSalida | null;
  condicionesMaritimas: MejorOpcionCondiciones;
  disponibilidad: MejorOpcionDisponibilidad;
  insight: string;
}

@Injectable({
  providedIn: 'root'
})
export class IntelligenceService {

  private readonly http = inject(HttpClient);

  mejorOpcion(fecha: string): Observable<MejorOpcionRespuesta> {
    return this.http.get<MejorOpcionRespuesta>(
      `${API_URL}/intelligence/mejor-opcion`, { params: { fecha } }
    );
  }

  afinidades(): Observable<AfinidadIntelligence[]> {
    return this.http.get<AfinidadIntelligence[]>(`${API_URL}/intelligence/afinidades`);
  }

  recomendaciones(): Observable<RecomendacionIntelligence[]> {
    return this.http.get<RecomendacionIntelligence[]>(
      `${API_URL}/intelligence/recomendaciones`
    );
  }
  planDia(fecha: string, zonaMaritima: ZonaMaritimaTour): Observable<PlanDiaRespuesta> {
  return this.http.get<PlanDiaRespuesta>(
    `${API_URL}/intelligence/plan-dia`,
    { params: { fecha, zonaMaritima } }
  );
}
}
