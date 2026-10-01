import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { HoraMarina, OceanService } from '../../../services/ocean.service';
import { ZONAS_MARITIMAS, ZonaMaritima } from '../zonas-maritimas';

@Component({
  selector: 'app-pronostico-marino',
  standalone: true,
  templateUrl: './pronostico-marino.html'
})
export class PronosticoMarino implements OnChanges {
  @Input({ required: true }) fecha = '';
  @Output() fechaChange = new EventEmitter<string>();
  readonly zonas = ZONAS_MARITIMAS.filter(zona => zona.id !== 'el-nuro');
  readonly zona = signal<ZonaMaritima>(this.zonas[0]);
  readonly horas = signal<HoraMarina[]>([]);
  readonly cargando = signal(false);
  readonly parcial = signal(false);
  private readonly ocean = inject(OceanService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private consulta?: Subscription;

  ngOnChanges(): void { this.cargar(); }

  cambiarZona(id: string): void {
    const zona = this.zonas.find(zona => zona.id === id);
    if (!zona || zona.id === this.zona().id) return;
    this.zona.set(zona);
    this.cargar();
  }

  cargar(): void {
    if (!this.navegador || !this.fecha) return;
    this.consulta?.unsubscribe();
    this.horas.set([]);
    this.parcial.set(false);
    this.cargando.set(true);
    this.consulta = this.ocean.pronostico(this.zona(), this.fecha)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: resultado => {
          this.horas.set(resultado.items);
          this.parcial.set(resultado.parcial);
          this.cargando.set(false);
        },
        error: () => { this.parcial.set(true); this.cargando.set(false); }
      });
  }

  valor(dato: number | null, unidad: string, divisor = 1): string {
    return dato === null ? 'No disponible'
      : `${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(dato / divisor)} ${unidad}`;
  }

  horasDestacadas(): HoraMarina[] {
  const horasObjetivo = new Set([
    '06:00',
    '09:00',
    '12:00',
    '15:00',
    '18:00'
  ]);

  return this.horas().filter(hora =>
    horasObjetivo.has(hora.hora.slice(11, 16))
  );
}

puntosOleaje(): string {
  const datos = this.horasDestacadas()
    .filter(hora => hora.oleaje !== null);

  if (datos.length < 2) {
    return '';
  }

  const valores = datos.map(hora => hora.oleaje as number);

  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = Math.max(maximo - minimo, 0.1);

  const ancho = 1000;
  const alto = 60;

  return datos
    .map((hora, indice) => {
      const x =
        datos.length === 1
          ? ancho / 2
          : (indice / (datos.length - 1)) * ancho;

      const normalizado =
        ((hora.oleaje as number) - minimo) / rango;

      const y =
        alto - 10 - normalizado * 35;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
}
