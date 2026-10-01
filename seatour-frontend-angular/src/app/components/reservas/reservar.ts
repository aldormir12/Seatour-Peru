import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ReservasService,
  Salida,
  errorReserva
} from '../../services/reservas.service';

@Component({
  selector: 'app-reservar',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './reservar.html'
})
export class ReservarComponent {
  private readonly api = inject(ReservasService);
  private readonly destroyRef = inject(DestroyRef);

  private consulta?: Subscription;
  private id = 0;

  readonly salida = signal<Salida | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');

  readonly pasajeros = new FormControl(1, {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.min(1),
      Validators.pattern(/^\d+$/)
    ]
  });

  constructor() {
    this.pasajeros.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.aviso.set(''));

    inject(ActivatedRoute).paramMap
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        this.id = Number(params.get('salidaId'));
        this.pasajeros.reset(1);
        this.cargar();
      });
  }

  cargar() {
    this.consulta?.unsubscribe();

    this.salida.set(null);
    this.error.set('');
    this.aviso.set('');
    this.cargando.set(false);

    if (!Number.isSafeInteger(this.id) || this.id <= 0) {
      this.error.set(
        'La salida solicitada no es válida. Elige una salida del catálogo.'
      );
      return;
    }

    this.cargando.set(true);

    this.consulta = this.api
      .salida(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: salida => {
          this.pasajeros.setValidators([
            Validators.required,
            Validators.min(1),
            Validators.max(salida.cuposDisponibles),
            Validators.pattern(/^\d+$/)
          ]);

          this.pasajeros.updateValueAndValidity();

          this.salida.set(salida);
          this.cargando.set(false);
        },

        error: error => {
          this.error.set(errorReserva(error));
          this.cargando.set(false);
        }
      });
  }

  disminuirPasajeros() {
    if (this.pasajeros.value <= 1) {
      return;
    }

    this.pasajeros.setValue(this.pasajeros.value - 1);
  }

  aumentarPasajeros() {
    const salida = this.salida();

    if (!salida || this.pasajeros.value >= salida.cuposDisponibles) {
      return;
    }

    this.pasajeros.setValue(this.pasajeros.value + 1);
  }

  puedeContinuar() {
    const salida = this.salida();

    return (
      !this.cargando() &&
      !!salida?.reservable &&
      salida.cuposDisponibles > 0 &&
      this.pasajeros.valid
    );
  }

  total() {
    if (this.pasajeros.invalid) {
      return 0;
    }

    const precio = this.salida()?.precioPorPasajero ?? 0;

    return (
      Math.round(precio * 100) *
      this.pasajeros.value /
      100
    );
  }

  continuar() {
    this.pasajeros.markAsTouched();

    if (!this.puedeContinuar()) {
      return;
    }

    this.aviso.set(
      'El siguiente paso aún no está disponible. No se ha creado ninguna reserva ni realizado ningún cobro.'
    );
  }
}