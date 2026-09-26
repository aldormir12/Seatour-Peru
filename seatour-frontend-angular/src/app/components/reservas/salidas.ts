import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReservasService, Salida, errorReserva } from '../../services/reservas.service';
import { AuthService } from '../../services/auth.service';
import { ReservasNav } from './reservas-nav';

@Component({
  selector: 'app-salidas', imports: [RouterLink, CurrencyPipe, DatePipe, ReservasNav],
  styleUrl: './reservas.css',
  template: `<app-reservas-nav />
    <main><h1>Elige tu próxima salida</h1><p>Horarios de Perú · Precios por pasajero en soles.</p>
    <button type="button" (click)="cargar()" [disabled]="cargando()">Actualizar disponibilidad</button>
    @if (tourId) { <p><a routerLink="/salidas">Ver todos los tours</a></p> }
    @if (cargando()) { <p role="status">Cargando salidas...</p> }
    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    <div class="cards">
    @for (s of salidas(); track s.id) {
      <article><h2>{{ s.tourNombre }}</h2><p>{{ s.fecha | date:'dd/MM/yyyy' }} · {{ s.horaSalida.slice(0,5) }}</p>
      <p>{{ s.embarcacionNombre }}</p><p>{{ s.precioPorPasajero | currency:'PEN':'S/ ' }} por pasajero</p>
      <p><strong>{{ reservas.cupos()[s.id] ?? s.cuposDisponibles }} cupos disponibles</strong></p>
      @if (s.reservable && (reservas.cupos()[s.id] ?? s.cuposDisponibles) > 0) {
        @if (auth.usuario() && !auth.tieneRol('CLIENTE')) { <p>La reserva está disponible para cuentas de cliente.</p> }
        @else { <a class="action" [routerLink]="['/reservar', s.id]">Elegir pasajeros</a> }
      } @else { <span class="badge">No disponible · {{ s.estado }}</span> }
      </article>
    } @empty { @if (!cargando() && !error()) { <p>No hay salidas programadas para mostrar.</p> } }
    </div></main>`
})
export class SalidasComponent {
  readonly reservas = inject(ReservasService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private peticion?: Subscription;
  tourId?: number;
  readonly salidas = signal<Salida[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.tourId = Number(params.get('tourId')) || undefined;
      this.cargar();
    });
  }
  cargar() {
    this.peticion?.unsubscribe();
    this.cargando.set(true); this.error.set('');
    this.peticion = this.reservas.salidas(this.tourId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: salidas => { this.salidas.set(salidas); this.cargando.set(false); },
      error: error => { this.error.set(errorReserva(error)); this.cargando.set(false); }
    });
  }
}
