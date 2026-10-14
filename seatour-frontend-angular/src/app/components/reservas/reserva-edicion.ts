import { Component, DestroyRef, effect, input, output, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { Adicional, CantidadesPasajeros, Reserva, ReservasService, TarifaPasajero, bloqueadaPorPlazoCliente, errorReserva } from '../../services/reservas.service';

@Component({
  selector: 'app-reserva-edicion',
  imports: [FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './reserva-edicion.html'
})
export class ReservaEdicionComponent {
  readonly reserva = input.required<Reserva>();
  readonly actualizada = output<Reserva>();
  readonly ocupada = output<boolean>();
  readonly deshabilitada = input(false);
  private readonly api = inject(ReservasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  readonly editando = signal(false);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  cantidades: CantidadesPasajeros = { ninos: 0, adultos: 1, adultosMayores: 0 };
  adicionales: Adicional[] = [];
  seleccion: number[] = [];
  private base = 0;
  private tarifas: TarifaPasajero[] = [];
  private revision = 0;
  constructor() { effect(() => this.ocupada.emit(this.cargando() || this.guardando())); }
  bloqueada(): boolean { return bloqueadaPorPlazoCliente(this.reserva(), this.auth.usuario()?.rol, this.api.ahora?.() ?? Date.now()); }
  permitida(): boolean { return !!this.reserva().puedeModificar && !this.bloqueada() && !this.deshabilitada(); }
  abrir(): void {
    if (!this.permitida() || this.cargando() || this.guardando()) return;
    const r = this.reserva();
    if (!r.tourId) { this.error.set('Actualiza el detalle de la reserva.'); return; }
    this.error.set(''); this.mensaje.set(''); this.cargando.set(true);
    forkJoin({ reserva: this.api.consultar(r.id), salida: this.api.salida(r.salidaId),
      tarifas: this.api.tarifas(), adicionales: this.api.adicionalesPorTour(r.tourId) }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: datos => {
        this.cargando.set(false);
        this.actualizada.emit(datos.reserva);
        if (!datos.reserva.puedeModificar || bloqueadaPorPlazoCliente(datos.reserva, this.auth.usuario()?.rol, this.api.ahora?.() ?? Date.now())) return;
        this.cantidades = { ninos: datos.reserva.ninos ?? 0, adultos: datos.reserva.adultos ?? datos.reserva.pasajeros,
          adultosMayores: datos.reserva.adultosMayores ?? 0 };
        this.revision = datos.reserva.revision ?? 0;
        this.base = datos.salida.precioPorPasajero; this.tarifas = datos.tarifas;
        this.adicionales = datos.adicionales;
        this.seleccion = (datos.reserva.adicionales ?? []).map(a => a.adicionalId);
        for (const a of datos.reserva.adicionales ?? []) {
          if (!this.adicionales.some(disponible => disponible.id === a.adicionalId)) {
            this.adicionales.push({ id: a.adicionalId, nombre: a.nombre + ' (ya no disponible; debes retirarlo)',
              descripcion: a.descripcion, precio: a.precioUnitario, tipoCobro: a.tipoCobro, activo: false });
          }
        }
        this.editando.set(true);
      }, error: e => { this.cargando.set(false); this.error.set(errorReserva(e)); }
    });
  }
  totalPasajeros(): number { return this.cantidades.ninos + this.cantidades.adultos + this.cantidades.adultosMayores; }
  valida(): boolean {
    return Object.values(this.cantidades).every(n => Number.isInteger(n) && n >= 0 && n <= 100)
      && this.totalPasajeros() >= 1 && this.totalPasajeros() <= 100
      && this.totalPasajeros() <= this.reserva().cuposDisponibles + this.reserva().pasajeros
      && !this.adicionales.some(a => !a.activo && this.seleccion.includes(a.id));
  }
  elegir(id: number, seleccionado: boolean): void {
    this.seleccion = seleccionado ? [...this.seleccion.filter(x => x !== id), id] : this.seleccion.filter(x => x !== id);
  }
  total(): number {
    const precio = (tipo: TarifaPasajero['tipo']) => {
      const descuento = this.tarifas.find(t => t.tipo === tipo)?.porcentajeDescuento ?? 0;
      return Math.round((Math.round(this.base * 100) / 100) * (100 - descuento)) / 100;
    };
    const pasajeros = precio('NINO') * this.cantidades.ninos + precio('ADULTO') * this.cantidades.adultos
      + precio('ADULTO_MAYOR') * this.cantidades.adultosMayores;
    const extras = this.adicionales.filter(a => this.seleccion.includes(a.id))
      .reduce((s, a) => s + a.precio * (a.tipoCobro === 'POR_PERSONA' ? this.totalPasajeros() : 1), 0);
    return Math.round((pasajeros + extras) * 100) / 100;
  }
  guardar(): void {
    if (!this.permitida() || !this.valida() || this.guardando() || this.cargando()) return;
    this.guardando.set(true); this.error.set('');
    this.api.modificar(this.reserva().id, this.cantidades, this.seleccion, this.total(), this.revision).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => { this.guardando.set(false); this.editando.set(false); this.actualizada.emit(r);
        this.mensaje.set(r.pagada ? 'Reserva actualizada. El ajuste económico registrado es simulado.' : 'Reserva actualizada.'); },
      error: e => { this.guardando.set(false); this.error.set(errorReserva(e)); }
    });
  }
}
