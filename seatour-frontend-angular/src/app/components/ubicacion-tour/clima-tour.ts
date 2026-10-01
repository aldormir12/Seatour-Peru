import { Component, DestroyRef, Input, OnChanges, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { OceanService } from '../../services/ocean.service';
import { ZonaMaritimaTour } from '../../services/tours';
import { ZONAS_MARITIMAS } from '../dashboard-cliente/zonas-maritimas';

@Component({
  selector: 'app-clima-tour',
  standalone: true,
  template: `@if (etiqueta()) {
    <span class="clima-chip ml-1 mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium" [attr.data-estado]="etiqueta()" [title]="referencia()">
      <svg class="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        @switch (etiqueta()) {
          @case ('Condiciones ideales') {
            <path d="m5 12 4 4L19 6" />
          }
          @case ('Mar favorable') {
            <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
          }
          @case ('Condiciones regulares') {
            <circle cx="12" cy="12" r="8" /><path d="M8 12h8" />
          }
          @case ('Oleaje elevado') {
            <path d="M3 16c3 0 3-9 9-9 4 0 5 5 2 6 0-3-4-2-3 1 1 3 6 4 10 2M3 20c3-2 5 2 9 0s5 2 9 0" />
          }
          @case ('Viento fuerte') {
            <path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a2 2 0 1 1-2 2M3 16h7a3 3 0 1 1-3 3" />
          }
        }
      </svg>
      {{ etiqueta() }}
    </span>
  }`,
  styles: [`
    .clima-chip { border-color: #e2e8f0; background: #f8fafc; color: #475569; }
    .clima-chip[data-estado="Condiciones ideales"] { border-color: #cce8d8; background: #f0f9f3; color: #28704b; }
    .clima-chip[data-estado="Mar favorable"] { border-color: #c6e7e9; background: #eff9fa; color: #27747b; }
    .clima-chip[data-estado="Condiciones regulares"] { border-color: #eee0bb; background: #fcf8ed; color: #8b6b22; }
    .clima-chip[data-estado="Oleaje elevado"] { border-color: #f1d7bf; background: #fff5ed; color: #a45b26; }
    .clima-chip[data-estado="Viento fuerte"] { border-color: #edcdd0; background: #fcf1f2; color: #a34a54; }
  `]
})
export class ClimaTour implements OnChanges {
  @Input() zonaMaritima: ZonaMaritimaTour | null | undefined;
  @Input() fechaHora: string | null | undefined;
  readonly etiqueta = signal('');
  readonly referencia = signal('');
  private readonly ocean = inject(OceanService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private consulta?: Subscription;

  ngOnChanges(): void {
    this.consulta?.unsubscribe();
    this.etiqueta.set('');
    if (!this.navegador || !this.zonaMaritima) return;
    const ids: Record<ZonaMaritimaTour, string> = {
      MANCORA: 'mancora', LOS_ORGANOS: 'los-organos', CABO_BLANCO: 'cabo-blanco', TALARA: 'talara'
    };
    const zona = ZONAS_MARITIMAS.find(z => z.id === ids[this.zonaMaritima!]);
    if (!zona) return;
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const parte = (tipo: string) => partes.find(p => p.type === tipo)?.value;
    const momento = this.fechaHora ?? `${parte('year')}-${parte('month')}-${parte('day')}T${parte('hour')}:00`;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(momento)) return;
    const hora = momento.slice(0, 13);
    this.referencia.set(`Pronóstico ${zona.nombre}: ${hora.replace('T', ' ')}:00 (Lima)${this.fechaHora ? '' : ' · hora actual'}`);
    this.consulta = this.ocean.pronosticoParaEtiqueta(zona, momento.slice(0, 10))
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: respuesta => {
          const datos = respuesta.items.find(item => item.hora.slice(0, 13) === hora);
          if (!datos) return;
          const { oleaje, viento, visibilidad } = datos;
          if (oleaje === null || viento === null || visibilidad === null
              || ![oleaje, viento, visibilidad].every(Number.isFinite)
              || oleaje < 0 || viento < 0 || visibilidad < 0) return;
          this.etiqueta.set(
            oleaje <= 1 && viento <= 20 && visibilidad >= 8000 ? 'Condiciones ideales'
            : oleaje <= 1.5 && viento <= 28 && visibilidad >= 5000 ? 'Mar favorable'
            : oleaje > 1.5 ? 'Oleaje elevado'
            : viento > 28 ? 'Viento fuerte' : 'Condiciones regulares'
          );
        },
        error: () => this.etiqueta.set('')
      });
  }
}
