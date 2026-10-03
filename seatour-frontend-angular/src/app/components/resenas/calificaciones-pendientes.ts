import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { Reserva, ReservasService } from '../../services/reservas.service';
import { CalificarReserva } from './calificar-reserva';
@Component({
  selector: 'app-calificaciones-pendientes', imports: [CalificarReserva],
  template: `@if (pendiente(); as reserva) { <app-calificar-reserva [reserva]="reserva" [automatico]="true" /> }
    @if (error()) { <p role="status" style="font-size:12px;color:#526577">No se pudieron consultar las experiencias pendientes de calificar.
      <button type="button" (click)="cargar()">Reintentar</button></p> }`
})
export class CalificacionesPendientes {
  private readonly reservas = inject(ReservasService);
  private readonly auth = inject(AuthService);
  private readonly destroy = inject(DestroyRef);
  readonly pendiente = signal<Reserva | null>(null);
  readonly error = signal(false);
  constructor() { afterNextRender(() => this.cargar()); }
  cargar(): void {
    if (this.auth.usuario()?.rol !== 'CLIENTE') return;
    this.error.set(false);
    this.reservas.listar().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: reservas => this.pendiente.set(reservas.find(r => r.puedeCalificar && !r.resena) ?? null),
      error: () => this.error.set(true)
    });
  }
}
