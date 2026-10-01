import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of, timeout, Observable, shareReplay } from 'rxjs';
import { ZonaMaritima } from '../components/dashboard-cliente/zonas-maritimas';

export interface CondicionesOpenMeteo {
  current?: { time?: string; [variable: string]: number | string | null | undefined };
}

interface PronosticoOpenMeteo {
  hourly?: { time: string[]; [variable: string]: (number | string | null)[] };
}

export interface HoraMarina {
  hora: string;
  oleaje: number | null;
  viento: number | null;
  visibilidad: number | null;
  temperaturaMar: number | null;
  condicion: string;
}

@Injectable({ providedIn: 'root' })
export class OceanService {
  private readonly http = inject(HttpClient);
  private readonly cacheEtiquetas = new Map<string, {
    expira: number; datos: Observable<{ items: HoraMarina[]; parcial: boolean }>;
  }>();

  pronosticoParaEtiqueta(zona: ZonaMaritima, fecha: string) {
    const ahora = Date.now();
    for (const [clave, entrada] of this.cacheEtiquetas) {
      if (entrada.expira <= ahora) this.cacheEtiquetas.delete(clave);
    }
    const clave = `${zona.id}:${fecha}`;
    const existente = this.cacheEtiquetas.get(clave);
    if (existente) return existente.datos;
    const datos = this.pronostico(zona, fecha).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.cacheEtiquetas.set(clave, { expira: ahora + 5 * 60_000, datos });
    return datos;
  }
  pronostico(zona: ZonaMaritima, fecha: string) {
    const params = {
      latitude: zona.latitud, longitude: zona.longitud, timezone: 'America/Lima',
      start_date: fecha, end_date: fecha
    };
    const consultar = (url: string, extras: Record<string, string>) =>
      this.http.get<PronosticoOpenMeteo>(url, { params: { ...params, ...extras } }).pipe(
        timeout(15000), catchError(() => of(null))
      );
    return forkJoin({
      weather: consultar('https://api.open-meteo.com/v1/forecast', {
        hourly: 'weather_code,wind_speed_10m,visibility', wind_speed_unit: 'kmh'
      }),
      marine: consultar('https://marine-api.open-meteo.com/v1/marine', {
        hourly: 'wave_height,sea_surface_temperature', cell_selection: 'sea'
      })
    }).pipe(map(({ weather, marine }) => {
      const w = weather?.hourly;
      const m = marine?.hourly;
      const horas = [...new Set([...(w?.time ?? []), ...(m?.time ?? [])])]
        .filter(hora => hora.startsWith(`${fecha}T`)).sort();
      const numero = (datos: PronosticoOpenMeteo['hourly'], campo: string, indice: number) => {
        const valor = datos?.[campo]?.[indice];
        return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
      };
      const items: HoraMarina[] = horas.map(hora => {
        const wi = w?.time.indexOf(hora) ?? -1;
        const mi = m?.time.indexOf(hora) ?? -1;
        return {
          hora, oleaje: numero(m, 'wave_height', mi), viento: numero(w, 'wind_speed_10m', wi),
          visibilidad: numero(w, 'visibility', wi),
          temperaturaMar: numero(m, 'sea_surface_temperature', mi),
          condicion: estadoClima(numero(w, 'weather_code', wi))
        };
      });
      return { items, parcial: !w || !m };
    }));
  }
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
