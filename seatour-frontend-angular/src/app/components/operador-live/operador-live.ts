import { Component, effect, inject, input } from '@angular/core';
import { LiveService } from '../../services/live.service';
import type { SalidaProgramada } from '../../services/salidas.service';

@Component({
  selector: 'app-operador-live',
  standalone: true,
  providers: [LiveService],
  template: `
    @if (salida().estado === 'EN_CURSO') {
      <section class="mb-6 border border-slate-200 bg-white p-4" aria-label="SeaTour Live">
        <h2>SeaTour Live</h2>
        @if (!live.transmitiendo() && !live.conectando()) {
          <button type="button" (click)="iniciar()" [disabled]="bloqueado()"
            class="border px-3 py-2 disabled:opacity-50">Iniciar transmisión</button>
        } @else {
          <p role="status">
            {{ live.conectando() ? 'Conectando cámara y micrófono...' :
               live.reconectando() ? 'Reconectando...' : 'Transmitiendo video y audio' }}
          </p>
          <button type="button" (click)="live.finalizar()" class="border px-3 py-2">
            {{ live.conectando() ? 'Cancelar conexión' : 'Finalizar transmisión' }}
          </button>
        }
        <video [srcObject]="live.preview()" [hidden]="!live.preview()"
          [muted]="true" autoplay playsinline aria-label="Preview local de la cámara"
          class="mt-3 w-full max-w-sm"></video>
        @if (live.error()) { <p role="alert">{{ live.error() }}</p> }
      </section>
    }
  `
})
export class OperadorLive {
  readonly salida = input.required<SalidaProgramada>();
  readonly bloqueado = input(false);
  readonly live = inject(LiveService);

  constructor() {
    let salidaId: number | undefined;
    effect(() => {
      const salida = this.salida();
      if (salida.estado !== 'EN_CURSO' ||
          (salidaId !== undefined && salidaId !== salida.id)) {
        void this.live.finalizar();
      }
      salidaId = salida.id;
    });
  }

  iniciar(): void {
    if (!this.bloqueado() && this.salida().estado === 'EN_CURSO') {
      void this.live.iniciar(this.salida());
    }
  }
}
