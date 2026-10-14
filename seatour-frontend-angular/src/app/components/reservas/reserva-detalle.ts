import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ReservaEdicionComponent } from './reserva-edicion';
import { reservasPorRol } from '../../navigation';
import { Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Reserva, ReservasService, bloqueadaParaCancelarCliente, errorReserva } from '../../services/reservas.service';

@Component({
  selector: 'app-reserva-detalle', imports: [CurrencyPipe, DatePipe, RouterLink, ReservaEdicionComponent],
  styleUrl: './reservas.css', templateUrl: './reserva-detalle.html'
})
export class ReservaDetalleComponent {
  readonly auth = inject(AuthService);
  readonly rutaReservas = reservasPorRol(this.auth.usuario()?.rol);
  private readonly api = inject(ReservasService);
  private readonly destroyRef = inject(DestroyRef);
  private sincronizando = false;
  private revisionDetalle = 0;
  private readonly route = inject(ActivatedRoute);
  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly reserva = signal<Reserva | null>(null);
  readonly cargando = signal(false);
  readonly enviando = signal(false);
  readonly editandoReserva = signal(false);
  readonly error = signal('');
  readonly mensaje = signal(this.route.snapshot.queryParamMap.has('creada') ? 'Reserva creada. Tus cupos están reservados y la confirmación del operador está pendiente.' : '');
  readonly accion = signal<'confirmar' | 'cancelar' | null>(null);
  constructor() {
    this.cargar();
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const refresco = setInterval(() => this.sincronizarDetalle(), 15000);
      this.destroyRef.onDestroy(() => clearInterval(refresco));
    }
  }
  private sincronizarDetalle(): void {
    if (!this.reserva() || this.sincronizando || this.cargando() || this.enviando()
        || this.editandoReserva() || document.hidden) return;
    const revision = this.revisionDetalle;
    this.sincronizando = true;
    this.api.consultar(this.id).pipe(takeUntilDestroyed(this.destroyRef),
      finalize(() => this.sincronizando = false)).subscribe({
      next: r => {
        if (revision !== this.revisionDetalle || this.cargando() || this.enviando() || this.editandoReserva()) return;
        this.reserva.set(r);
        if (!this.puedeCancelar(r) && this.accion() === 'cancelar') this.accion.set(null);
      },
      error: () => { /* Mantener el mensaje de la operación actual. */ }
    });
  }
  cargar(conservarError = false) {
    if (this.cargando() || this.enviando() || this.editandoReserva()) return;
    ++this.revisionDetalle;
    this.cargando.set(true); this.accion.set(null);
    if (!conservarError) this.error.set('');
    this.api.consultar(this.id).subscribe({
      next: reserva => { this.reserva.set(reserva); this.cargando.set(false); },
      error: error => { this.reserva.set(null); this.error.set(errorReserva(error)); this.cargando.set(false); }
    });
  }
  puedeCancelar(r: Reserva): boolean {
    return r.puedeCancelar && !bloqueadaParaCancelarCliente(r, this.auth.usuario()?.rol, this.api.ahora?.() ?? Date.now());
  }
  alModificarReserva(r: Reserva): void { ++this.revisionDetalle; this.reserva.set(r); this.accion.set(null); }
  ejecutar() {
    const accion = this.accion();
    if (!accion || this.enviando() || this.cargando() || this.editandoReserva()) return;
    if (accion === 'cancelar' && this.reserva() && !this.puedeCancelar(this.reserva()!)) return;
    ++this.revisionDetalle;
    this.enviando.set(true); this.error.set(''); this.mensaje.set('');
    const peticion = accion === 'confirmar' ? this.api.confirmar(this.id) : this.api.cancelar(this.id);
    peticion.subscribe({
      next: reserva => {
        this.reserva.set(reserva); this.enviando.set(false); this.accion.set(null);
        this.mensaje.set(accion === 'confirmar' ? 'Reserva confirmada.' : 'Reserva cancelada. Los cupos se han liberado.');
      },
      error: error => {
        this.enviando.set(false); this.accion.set(null); this.error.set(errorReserva(error));
        this.cargar(true);
      }
    });
  }
}
