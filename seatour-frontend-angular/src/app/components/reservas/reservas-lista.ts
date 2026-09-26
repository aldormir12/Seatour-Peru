import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Reserva, ReservasService, errorReserva } from '../../services/reservas.service';
import { ReservasNav } from './reservas-nav';

@Component({
  selector: 'app-reservas-lista', imports: [CurrencyPipe, DatePipe, RouterLink, ReservasNav],
  styleUrl: './reservas.css',
  template: `<app-reservas-nav [protegida]="true" /><main>
    <h1>{{ gestion ? 'Gestión de reservas' : 'Mis reservas' }}</h1>
    <p>{{ gestion ? 'Consulta las reservas y abre su detalle para confirmar o cancelar.' : 'Consulta tus viajes y administra tus reservas.' }}</p>
    <div class="actions"><button type="button" (click)="cargar()" [disabled]="cargando()">Actualizar</button>
      @if (!gestion) { <a class="action" routerLink="/salidas">Nueva reserva</a> }</div>
    <label for="estado">Filtrar por estado</label>
    <select id="estado" (change)="filtro.set($any($event.target).value)">
      <option value="">Todos</option><option value="PENDIENTE">Pendientes</option>
      <option value="CONFIRMADA">Confirmadas</option><option value="CANCELADA">Canceladas</option>
    </select>
    @if (cargando()) { <p role="status">Cargando reservas...</p> }
    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    <div class="cards">
    @for (r of visibles(); track r.id) {
      <article><h2>{{ r.tourNombre }}</h2><span class="badge">{{ r.estado }}</span>
        <p>Reserva #{{ r.id }} · {{ r.fecha | date:'dd/MM/yyyy' }} · {{ r.horaSalida.slice(0,5) }}</p>
        @if (gestion) { <p>Cliente: {{ r.clienteNombre }} (#{{ r.clienteId }})</p> }
        <p>{{ r.pasajeros }} pasajero(s) · {{ r.precioTotal | currency:'PEN':'S/ ' }}</p>
        <a class="action" [routerLink]="['/reservas', r.id]">Ver detalle</a>
      </article>
    } @empty { @if (!cargando() && !error()) { <p>No hay reservas para mostrar.</p> } }
    </div></main>`
})
export class ReservasListaComponent {
  private readonly api = inject(ReservasService);
  readonly gestion = !!inject(ActivatedRoute).snapshot.data['gestion'];
  readonly reservas = signal<Reserva[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly filtro = signal('');
  readonly visibles = computed(() => this.reservas().filter(r => !this.filtro() || r.estado === this.filtro()));
  constructor() { this.cargar(); }
  cargar() {
    if (this.cargando()) return;
    this.cargando.set(true); this.error.set('');
    this.api.listar(this.gestion).subscribe({
      next: reservas => { this.reservas.set(reservas); this.cargando.set(false); },
      error: error => { this.reservas.set([]); this.error.set(errorReserva(error)); this.cargando.set(false); }
    });
  }
}
