import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Reserva, ReservasService } from '../../services/reservas.service';
import { AuthService } from '../../services/auth.service';
import { ResenasService } from '../../services/resenas.service';
@Component({
  selector: 'app-calificar-reserva',
  template: `
    @if (auth.usuario()?.rol === 'CLIENTE') {
      @if (propia(); as resena) {
        <p class="own-rating">Tu calificación: ★ {{ resena.puntuacion }} / 5</p>
      } @else if (reserva().puedeCalificar) {
        <button type="button" class="rate-action" (click)="abrir()"><span aria-hidden="true">★</span> Calificar</button>
      }
    }
    <dialog #modal class="review-dialog" aria-label="Califica tu experiencia"
      (click)="$event.target === modal && cerrar()" (cancel)="$event.preventDefault(); cerrar()">
      <div class="review-body">
        <button type="button" class="review-close" aria-label="Cerrar calificación" (click)="cerrar()" [disabled]="enviando()">×</button>
        <span class="review-eyebrow">SEATOUR · TU EXPERIENCIA</span>
        <h2>{{ propia() ? 'Gracias por tu opinión' : '¿Cómo fue tu experiencia?' }}</h2>
        <p>{{ reserva().tourNombre }}</p>
        @if (propia(); as resena) {
          <p class="own-rating">★ {{ resena.puntuacion }} / 5</p>
          <button type="button" class="rate-button" (click)="cerrar()">Listo</button>
        } @else {
          <fieldset class="review-stars" [disabled]="enviando()" (mouseleave)="hoverPuntuacion.set(0)">
            <legend>Selecciona de 1 a 5 estrellas</legend>
            @for (valor of [1,2,3,4,5]; track valor) {
              <button type="button" class="review-star" [class.selected]="valor <= (hoverPuntuacion() || puntuacion())"
                [attr.aria-pressed]="puntuacion() === valor" [attr.aria-label]="valor + (valor === 1 ? ' estrella' : ' estrellas')"
                [disabled]="enviando()" (mouseenter)="hoverPuntuacion.set(valor)"
                (click)="puntuacion.set(valor)"><span aria-hidden="true">★</span></button>
            }
          </fieldset>
          <label class="comment-label" [attr.for]="'comentario-' + reserva().id">Comentario (opcional)</label>
          <textarea [id]="'comentario-' + reserva().id" maxlength="2000" rows="4" [value]="comentario()"
            (input)="comentario.set($any($event.target).value)" [disabled]="enviando()" placeholder="Cuéntanos qué te pareció"></textarea>
          <small>{{ comentario().length }} / 2000</small>
          <button type="button" class="rate-button submit-rating" (click)="enviar()" [disabled]="puntuacion() === 0 || enviando()">
            {{ enviando() ? 'Enviando…' : 'Enviar calificación' }}
          </button>
        }
        @if (error()) { <p class="review-error" role="alert">{{ error() }}</p> }
      </div>
    </dialog>
  `,
  styleUrl: './resenas.css'
})
export class CalificarReserva {
  readonly reserva = input.required<Reserva>();
  readonly automatico = input(false);
  readonly auth = inject(AuthService);
  private readonly api = inject(ResenasService);
  private readonly reservas = inject(ReservasService);
  private readonly destroy = inject(DestroyRef);
  private readonly modal = viewChild<ElementRef<HTMLDialogElement>>('modal');
  readonly propia = computed(() => this.api.propias()[this.reserva().id] ?? this.reserva().resena);
  readonly puntuacion = signal(0);
  readonly hoverPuntuacion = signal(0);
  readonly comentario = signal('');
  readonly enviando = signal(false);
  readonly error = signal('');
  constructor() { afterNextRender(() => { if (this.automatico()) this.abrir(); }); }
  abrir(): void {
    if (this.auth.usuario()?.rol !== 'CLIENTE' || !this.reserva().puedeCalificar || this.propia()) return;
    this.modal()?.nativeElement.showModal();
  }
  cerrar(): void {
    if (!this.enviando()) {
      this.hoverPuntuacion.set(0);
      this.modal()?.nativeElement.close();
    }
  }
  enviar(): void {
    if (this.enviando() || this.propia() || !this.reserva().puedeCalificar || this.puntuacion() < 1 || this.puntuacion() > 5) return;
    this.enviando.set(true); this.error.set('');
    this.api.crear(this.reserva().id, this.puntuacion(), this.comentario()).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: resena => {
        this.enviando.set(false);
        this.api.listar(resena.tourId).pipe(takeUntilDestroyed(this.destroy)).subscribe({
          error: () => this.error.set('Tu calificación se guardó. No se pudo refrescar el resumen; abre Ver reseñas para actualizarlo.')
        });
      },
      error: error => {
        this.enviando.set(false);
        this.error.set(error.error?.detail || 'No se pudo guardar la calificación. Inténtalo nuevamente.');
        if (error.status === 409) this.reservas.consultar(this.reserva().id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
          next: reserva => { if (reserva.resena) this.api.propias.update(actual => ({ ...actual, [reserva.id]: reserva.resena! })); },
          error: () => {}
        });
      }
    });
  }
}
