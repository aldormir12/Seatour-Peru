import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { UsuariosService } from './usuarios.service';
import { API_URL } from './auth.service';
import type { UsuarioAdministrable } from './usuarios.service';
import type { Reserva } from './reservas.service';

export type EstadoSalida =
  | 'PROGRAMADA'
  | 'EN_CURSO'
  | 'COMPLETADA'
  | 'CANCELADA';

export interface SalidaProgramada {
  tieneReservas: boolean;
  cambioOperativoConsumido: boolean;
  pasajerosReservados: number;
  fechaOriginal: string | null;
  horaOriginal: string | null;
  fechaAnterior: string | null;
  horaAnterior: string | null;
  motivoReprogramacion: string | null;
  id: number;
  fecha: string;
  horaSalida: string;
  inicioReal: string | null;
  finReal: string | null;
  cuposDisponibles: number;
  estado: EstadoSalida;

  tourId: number;
  tourNombre: string;
  duracionMinutos: number | null;

  embarcacionId: number;
  embarcacionNombre: string;

  operadorId: number | null;
  operadorNombre: string | null;
  operadorApellido: string | null;

  precioPorPasajero: number;
  reservable: boolean;
}

export interface SalidaSolicitud {
  motivoReprogramacion?: string;
  fecha: string;
  horaSalida: string;
  tourId: number;
  embarcacionId: number;
  operadorId: number;
}

export interface CambioEstadoSalida {
  estado: EstadoSalida;
}

export interface EmbarcacionActivaSalida {
  id: number;
  nombre: string;
  matricula: string;
  tipo: string;
  capacidad: number;
  activo: boolean;
  imagenUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class SalidasService {

  private readonly apiUrl = `${API_URL}/salidas`;
  private readonly usuarios = inject(UsuariosService);

  constructor(private http: HttpClient) {}

  listarMisSalidas(): Observable<SalidaProgramada[]> {
    return this.http.get<SalidaProgramada[]>(`${this.apiUrl}/mis-salidas`);
  }

  obtenerSalidaPropia(id: number): Observable<SalidaProgramada> {
    return this.http.get<SalidaProgramada>(`${this.apiUrl}/mis-salidas/${id}`);
  }

  obtenerReservasSalidaPropia(id: number): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/mis-salidas/${id}/reservas`);
  }

  listar(): Observable<SalidaProgramada[]> {
    return this.http.get<SalidaProgramada[]>(this.apiUrl);
  }

  obtenerPorId(id: number): Observable<SalidaProgramada> {
    return this.http.get<SalidaProgramada>(
      `${this.apiUrl}/${id}`
    );
  }

  listarPorTour(tourId: number): Observable<SalidaProgramada[]> {
    return this.http.get<SalidaProgramada[]>(
      `${this.apiUrl}/tour/${tourId}`
    );
  }

  listarDisponiblesPorTour(
    tourId: number
  ): Observable<SalidaProgramada[]> {
    return this.http.get<SalidaProgramada[]>(
      `${this.apiUrl}/tour/${tourId}/disponibles`
    );
  }

  crear(
    datos: SalidaSolicitud
  ): Observable<SalidaProgramada> {
    return this.http.post<SalidaProgramada>(
      this.apiUrl,
      datos
    );
  }

  actualizar(
    id: number,
    datos: SalidaSolicitud
  ): Observable<SalidaProgramada> {
    return this.http.put<SalidaProgramada>(
      `${this.apiUrl}/${id}`,
      datos
    );
  }

  cambiarEstado(
    id: number,
    estado: EstadoSalida,
    motivoCancelacion?: string
  ): Observable<SalidaProgramada> {
    return this.http.patch<SalidaProgramada>(
      `${this.apiUrl}/${id}/estado`,
      motivoCancelacion === undefined ? { estado } : { estado, motivoCancelacion }
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }

  cambiarEmbarcacion(id: number, embarcacionId: number, motivo: string): Observable<SalidaProgramada> {
    return this.http.patch<SalidaProgramada>(`${this.apiUrl}/${id}/embarcacion`, { embarcacionId, motivo });
  }

  listarEmbarcacionesActivas():
    Observable<EmbarcacionActivaSalida[]> {
    return this.http.get<EmbarcacionActivaSalida[]>(
      `${this.apiUrl}/embarcaciones/activas`
    );
  }

  listarOperadoresActivos(): Observable<UsuarioAdministrable[]> {
    return this.usuarios.listar().pipe(
      map(usuarios => usuarios.filter(usuario => usuario.rol === 'OPERADOR' && usuario.activo))
    );
  }
}
