import { Component, DestroyRef, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResenasService } from '../../services/resenas.service';
import { Tour } from '../../services/tours';
@Component({
  selector: 'app-resenas-tour', imports: [DatePipe, DecimalPipe],
  template: `
    <div class="review-card-summary">
      <span>★ {{ promedio() === null ? '—' : (promedio() | number:'1.1-2') }} ({{ cantidad() }})</span>
      <button type="button" (click)="abrir(); $event.stopPropagation()">Ver reseñas &gt;</button>
    </div>
    <dialog #modal class="review-dialog" aria-label="Reseñas del tour"
      (click)="$event.target === modal && cerrar()" (cancel)="$event.preventDefault(); cerrar()">
      <div class="review-body">
        <button type="button" class="review-close" aria-label="Cerrar reseñas" (click)="cerrar()">×</button>
        <span class="review-eyebrow">SEATOUR · OPINIONES</span><h2>{{ tour().nombre }}</h2>
        <p class="review-average">★ {{ promedio() === null ? '—' : (promedio() | number:'1.1-2') }} <small>({{ cantidad() }} reseñas)</small></p>
        @if (cargando()) { <p role="status">Cargando reseñas…</p> }
        @else if (error()) { <p class="review-error" role="alert">{{ error() }}</p><button type="button" class="rate-button" (click)="cargar()">Reintentar</button> }
        @else if (tieneResenas) {
          @for (resena of resumen()!.resenas; track resena.id) {
            <article class="review-item"><strong>★ {{ resena.puntuacion }} / 5</strong>
              <time>{{ resena.creadaEn | date:'dd/MM/yyyy, HH:mm':'-0500' }}</time>
              @if (resena.comentario) { <p>{{ resena.comentario }}</p> }
            </article>
          }
        } @else { <p>Aún no hay reseñas para este tour.</p> }
      </div>
    </dialog>
  `, styleUrl: './resenas.css'
})
export class ResenasTour {
  readonly tour = input.required<Pick<Tour, 'id' | 'nombre' | 'promedioEstrellas' | 'cantidadResenas'>>();
  private readonly api = inject(ResenasService);
  private readonly destroy = inject(DestroyRef);
  private readonly modal = viewChild<ElementRef<HTMLDialogElement>>('modal');
  readonly resumen = computed(() => this.api.resumenes()[this.tour().id]);
  get tieneResenas(): boolean {
    return (this.resumen()?.resenas?.length ?? 0) > 0;
  }
  readonly promedio = computed(() => this.resumen()?.promedio ?? this.tour().promedioEstrellas ?? null);
  readonly cantidad = computed(() => this.resumen()?.cantidad ?? this.tour().cantidadResenas ?? 0);
  readonly cargando = signal(false); readonly error = signal('');
  abrir(): void { this.modal()?.nativeElement.showModal(); this.cargar(); }
  cerrar(): void { this.modal()?.nativeElement.close(); }
  cargar(): void {
    if (this.cargando()) return;
    this.cargando.set(true); this.error.set('');
    this.api.listar(this.tour().id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => this.cargando.set(false),
      error: () => { this.cargando.set(false); this.error.set('No se pudieron cargar las reseñas. Inténtalo nuevamente.'); }
    });
  }
}
