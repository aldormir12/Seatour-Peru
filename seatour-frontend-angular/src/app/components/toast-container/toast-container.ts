import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ToastService, ToastType } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-none fixed right-4 top-4 z-[100] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm flex-col gap-3 overflow-y-auto"
         aria-label="Notificaciones">
      @for (toast of service.toasts(); track toast.id) {
        <div class="pointer-events-auto flex items-start gap-3 rounded-xl border border-l-4 p-4 shadow-lg"
             [ngClass]="styles[toast.type]"
             [attr.role]="toast.type === 'error' ? 'alert' : 'status'" aria-atomic="true">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 font-bold" aria-hidden="true">{{ icons[toast.type] }}</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">{{ labels[toast.type] }}</p>
            <p class="mt-1 whitespace-pre-wrap break-words text-sm">{{ toast.message }}</p>
          </div>
          <button type="button" (click)="service.dismiss(toast.id)"
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                  aria-label="Cerrar notificación">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastContainer implements OnDestroy {
  readonly service = inject(ToastService);
  readonly icons: Record<ToastType, string> = {
    success: '✓', error: '!', warning: '!', info: 'i'
  };
  readonly labels: Record<ToastType, string> = {
    success: 'Éxito', error: 'Error', warning: 'Aviso', info: 'Información'
  };
  readonly styles: Record<ToastType, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    warning: 'border-yellow-300 bg-yellow-50 text-yellow-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900'
  };
  ngOnDestroy(): void { this.service.clear(); }
}
