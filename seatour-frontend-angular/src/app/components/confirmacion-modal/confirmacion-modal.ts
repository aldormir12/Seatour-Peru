import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, inject, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmacionService } from '../../services/confirmacion.service';

@Component({
  selector: 'app-confirmacion-modal',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialogo aria-labelledby="confirmacion-titulo" aria-describedby="confirmacion-mensaje"
            class="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
            (cancel)="$event.preventDefault(); servicio.responder(false)">
      @if (servicio.solicitud(); as opciones) {
        <div class="p-6">
          <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold"
               [ngClass]="opciones.variante === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'"
               aria-hidden="true">!</div>
          <h2 id="confirmacion-titulo" class="text-lg font-bold">{{ opciones.titulo }}</h2>
          <p id="confirmacion-mensaje" class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{{ opciones.mensaje }}</p>
        </div>
        <div class="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" autofocus (click)="servicio.responder(false)"
                  class="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2">
            {{ opciones.textoCancelar || 'Cancelar' }}
          </button>
          <button type="button" (click)="servicio.responder(true)"
                  class="rounded-lg px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                  [ngClass]="opciones.variante === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'">
            {{ opciones.textoConfirmar || 'Confirmar' }}
          </button>
        </div>
      }
    </dialog>
  `
})
export class ConfirmacionModal implements OnDestroy {
  readonly servicio = inject(ConfirmacionService);
  private readonly dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    effect(() => {
      const dialogo = this.dialogo()?.nativeElement;
      if (!dialogo) return;
      if (this.servicio.solicitud() && !dialogo.open) dialogo.showModal();
      else if (!this.servicio.solicitud() && dialogo.open) dialogo.close();
    });
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe(evento => {
      if (evento instanceof NavigationStart) this.servicio.responder(false);
    });
  }

  ngOnDestroy(): void { this.servicio.responder(false); }
}
