import { reservasPorRol } from '../../navigation';
import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Reserva, ReservasService, errorReserva } from '../../services/reservas.service';

@Component({
  selector: 'app-reserva-detalle', imports: [CurrencyPipe, DatePipe, RouterLink],
  styleUrl: './reservas.css', templateUrl: './reserva-detalle.html'
})
export class ReservaDetalleComponent {
  readonly auth = inject(AuthService);
  readonly rutaReservas = reservasPorRol(this.auth.usuario()?.rol);
  private readonly api = inject(ReservasService);
  private readonly route = inject(ActivatedRoute);
  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly reserva = signal<Reserva | null>(null);
  readonly cargando = signal(false);
  readonly enviando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal(this.route.snapshot.queryParamMap.has('creada') ? 'Reserva creada. Tus cupos están reservados y la confirmación del operador está pendiente.' : '');
  readonly accion = signal<'confirmar' | 'cancelar' | null>(null);
  constructor() { this.cargar(); }
  cargar(conservarError = false) {
    if (this.cargando() || this.enviando()) return;
    this.cargando.set(true); this.accion.set(null);
    if (!conservarError) this.error.set('');
    this.api.consultar(this.id).subscribe({
      next: reserva => { this.reserva.set(reserva); this.cargando.set(false); },
      error: error => { this.reserva.set(null); this.error.set(errorReserva(error)); this.cargando.set(false); }
    });
  }
  ejecutar() {
    const accion = this.accion();
    if (!accion || this.enviando() || this.cargando()) return;
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
