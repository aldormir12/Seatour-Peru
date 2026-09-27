import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReservasService, Salida, errorReserva } from '../../services/reservas.service';

@Component({
  selector: 'app-reservar', imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  styleUrl: './reservas.css', templateUrl: './reservar.html'
})
export class ReservarComponent {
  private readonly api = inject(ReservasService);
  private readonly router = inject(Router);
  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('salidaId'));
  readonly salida = signal<Salida | null>(null);
  readonly cargando = signal(false);
  readonly enviando = signal(false);
  readonly resumen = signal(false);
  readonly error = signal('');
  readonly pasajeros = new FormControl(1, { nonNullable: true,
    validators: [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)] });
  constructor() { this.cargar(); }
  cargar(revisar = false) {
    if (this.cargando() || this.enviando()) return;
    this.cargando.set(true); this.resumen.set(false);
    this.api.salida(this.id).subscribe({
      next: salida => {
        this.salida.set(salida); this.cargando.set(false);
        this.pasajeros.setValidators([Validators.required, Validators.min(1), Validators.max(salida.cuposDisponibles), Validators.pattern(/^\d+$/)]);
        this.pasajeros.updateValueAndValidity();
        if (revisar) {
          this.pasajeros.markAsTouched();
          if (!salida.reservable) this.error.set('Esta salida ya no admite reservas. Elige otra salida.');
          else if (this.pasajeros.valid) this.resumen.set(true);
        }
      },
      error: error => { this.error.set(errorReserva(error)); this.cargando.set(false); }
    });
  }
  revisar() { this.error.set(''); this.cargar(true); }
  total() { return Math.round((this.salida()?.precioPorPasajero ?? 0) * 100) * this.pasajeros.value / 100; }
  reservar() {
    const salida = this.salida();
    if (!salida || !this.resumen() || this.pasajeros.invalid || this.enviando()) return;
    this.enviando.set(true); this.error.set('');
    this.api.crear(salida.id, this.pasajeros.value, salida.precioPorPasajero).subscribe({
      next: reserva => {
        this.enviando.set(false); this.resumen.set(false);
        void this.router.navigate(['/app/mis-reservas', reserva.id], { queryParams: { creada: '1' } });
      },
      error: error => {
        this.enviando.set(false); this.resumen.set(false); this.error.set(errorReserva(error));
        this.cargar();
      }
    });
  }
}
