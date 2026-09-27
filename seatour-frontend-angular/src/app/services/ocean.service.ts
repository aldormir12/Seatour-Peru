import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, of, timeout } from 'rxjs';
import { ZonaMaritima } from '../components/dashboard-cliente/zonas-maritimas';

export interface CondicionesOpenMeteo {
  current?: { time?: string; [variable: string]: number | string | null | undefined };
}

@Injectable({ providedIn: 'root' })
export class OceanService {
  private readonly http = inject(HttpClient);
  consultar(zona: ZonaMaritima) {
    const params = { latitude: zona.latitud, longitude: zona.longitud, timezone: 'America/Lima' };
    const consultar = (url: string, extras: Record<string, string>) =>
      this.http.get<CondicionesOpenMeteo>(url, { params: { ...params, ...extras } }).pipe(
        timeout(15000), catchError(() => of(null))
      );
    return forkJoin({
      weather: consultar('https://api.open-meteo.com/v1/forecast', {
        current: 'temperature_2m,weather_code,wind_speed_10m,visibility',
        temperature_unit: 'celsius', wind_speed_unit: 'kmh'
      }),
      marine: consultar('https://marine-api.open-meteo.com/v1/marine', {
        current: 'wave_height,sea_surface_temperature', cell_selection: 'sea'
      })
    });
  }
}

export function estadoClima(codigo: unknown): string {
  if (typeof codigo !== 'number') return 'No disponible';
  const estados: Record<number, string> = {
    0: 'Cielo despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna moderada',
    55: 'Llovizna intensa', 56: 'Llovizna helada ligera', 57: 'Llovizna helada intensa',
    61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia intensa',
    66: 'Lluvia helada ligera', 67: 'Lluvia helada intensa',
    71: 'Nieve ligera', 73: 'Nieve moderada', 75: 'Nieve intensa', 77: 'Granos de nieve',
    80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos intensos',
    85: 'Chubascos de nieve ligeros', 86: 'Chubascos de nieve intensos',
    95: 'Tormenta', 96: 'Tormenta con granizo ligero', 99: 'Tormenta con granizo intenso'
  };
  return estados[codigo] ?? 'No disponible';
}
