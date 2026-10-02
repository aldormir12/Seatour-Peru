import { isPlatformBrowser } from '@angular/common';
import { Component, effect, inject, input, PLATFORM_ID, signal } from '@angular/core';
import { IntelligenceService, MejorOpcionRespuesta } from '../../../services/intelligence.service';
import { Tours } from '../../../services/tours';

@Component({
  selector: 'app-mejor-opcion-hoy',
  standalone: true,
  templateUrl: './mejor-opcion-hoy.html'
})
export class MejorOpcionHoyComponent {
  readonly toursService = inject(Tours);
  readonly fecha = input.required<string>();

  readonly respuesta = signal<MejorOpcionRespuesta | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  private readonly intelligence = inject(IntelligenceService);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    effect(onCleanup => {
      const fecha = this.fecha();

      this.respuesta.set(null);
      this.error.set('');
      this.cargando.set(false);

      if (!this.navegador || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;

      this.cargando.set(true);

      const consulta = this.intelligence.mejorOpcion(fecha).subscribe({
        next: respuesta => {
          this.respuesta.set(respuesta);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar tu mejor opción para esta fecha.');
          this.cargando.set(false);
        }
      });

      onCleanup(() => consulta.unsubscribe());
    });
  }

  nombreZona(zona: string | null): string {
    const nombres: Record<string, string> = {
      MANCORA: 'Máncora',
      LOS_ORGANOS: 'Los Órganos',
      CABO_BLANCO: 'Cabo Blanco',
      TALARA: 'Talara'
    };

    return zona ? (nombres[zona] ?? zona) : 'Sin zona';
  }

  private fechaHoy(): string {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valor = (tipo: string) => partes.find(p => p.type === tipo)?.value;
    return `${valor('year')}-${valor('month')}-${valor('day')}`;
  }

  titulo(opcion: MejorOpcionRespuesta): string {
    const fechaSalida = opcion.fechaSalida ?? opcion.mejorVentanaHoraria?.inicio.slice(0, 10) ?? opcion.fecha;
    return fechaSalida === this.fechaHoy() ? 'Tu mejor opción hoy' : 'Tu próxima mejor opción';
  }

  fechaHora(inicio: string): string {
    const fecha = inicio.slice(0, 10);
    const hoy = this.fechaHoy();
    const manana = new Date(`${hoy}T12:00:00-05:00`);
    manana.setUTCDate(manana.getUTCDate() + 1);
    const fechaManana = manana.toISOString().slice(0, 10);
    const etiqueta = fecha === hoy ? 'Hoy' : fecha === fechaManana ? 'Mañana'
      : new Intl.DateTimeFormat('es-PE', {
          day: '2-digit', month: 'short', timeZone: 'America/Lima'
        }).format(new Date(`${fecha}T12:00:00-05:00`)).replace('.', '');
    return `${etiqueta} · ${this.horaAmPm(inicio)}`;
  }

  horaAmPm(valor: string): string {
    const [horas, minutos] = this.hora(valor).split(':').map(Number);
    if (!Number.isFinite(horas) || !Number.isFinite(minutos)) return '--:--';
    return `${horas % 12 || 12}:${String(minutos).padStart(2, '0')} ${horas < 12 ? 'a. m.' : 'p. m.'}`;
  }

  hora(valor: string | null | undefined): string {
    if (!valor) return '--:--';

    if (/^\d{2}:\d{2}/.test(valor)) {
      return valor.slice(0, 5);
    }

    if (valor.includes('T')) {
      return valor.slice(11, 16);
    }

    return valor;
  }

  porcentajePosicion(hora: string | null | undefined): number {
    const valor = this.hora(hora);
    const [h, m] = valor.split(':').map(Number);

    if (!Number.isFinite(h) || !Number.isFinite(m)) return 50;

    const minutos = h * 60 + m;

    const inicio = 6 * 60;
    const fin = 18 * 60;

    return Math.min(
      100,
      Math.max(0, ((minutos - inicio) / (fin - inicio)) * 100)
    );
  }

  anchoVentana(
    inicio: string | null | undefined,
    fin: string | null | undefined
  ): number {
    return Math.max(
      5,
      this.porcentajePosicion(fin) - this.porcentajePosicion(inicio)
    );
  }

  colorAfinidad(score: number): string {
    if (score >= 85) return '#18c8bb';
    if (score >= 70) return '#149ddb';
    if (score >= 50) return '#f4b942';
    return '#e87575';
  }

  etiquetaCondiciones(opcion: MejorOpcionRespuesta): string {
    const condiciones = opcion.condicionesMaritimas;

    if (condiciones.estado === 'NO_DISPONIBLE') {
      return 'Pronóstico no disponible';
    }

    const oleaje = condiciones.oleajeMaximoMetros;
    const viento = condiciones.vientoMaximoKmh;
    const visibilidad = condiciones.visibilidadMinimaMetros;

    if (
      oleaje !== null &&
      viento !== null &&
      visibilidad !== null &&
      oleaje <= 1 &&
      viento <= 20 &&
      visibilidad >= 8000
    ) {
      return 'Condiciones ideales';
    }

    if (
      oleaje !== null &&
      viento !== null &&
      visibilidad !== null &&
      oleaje <= 1.5 &&
      viento <= 28 &&
      visibilidad >= 5000
    ) {
      return 'Mar favorable';
    }

    return condiciones.estado === 'PARCIAL'
      ? 'Pronóstico parcial'
      : 'Condiciones variables';
  }

  etiquetaDisponibilidad(cupos: number): string {
    if (cupos >= 10) return 'Alta disponibilidad';
    if (cupos >= 5) return 'Disponibilidad media';
    return 'Pocos cupos';
  }

  visibilidadKm(metros: number | null): string {
    if (metros === null) return '—';

    return `${(metros / 1000).toLocaleString('es-PE', {
      maximumFractionDigits: 1
    })} km`;
  }

  numero(valor: number | null, unidad: string): string {
    if (valor === null) return '—';

    return `${valor.toLocaleString('es-PE', {
      maximumFractionDigits: 1
    })} ${unidad}`;
  }
}
