import { Component, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, concatMap, dematerialize, finalize, map, materialize, timer } from 'rxjs';
import { PlanDiaItem } from '../../../services/intelligence.service';
import { PlanPagoRespuesta, PlanPagoSolicitud, PlanResumen, ReservaPlanService } from '../../../services/reserva-plan.service';
import { MetodoPago } from '../../../services/pagos.service';
import { validarLuhn } from './pago-validadores';
import { Adicional, CantidadesPasajeros, ReservaAdicional, ReservasService, TarifaPasajero, TipoPasajero } from '../../../services/reservas.service';
import { cantidadPasajero, cambiarComposicionPasajeros } from '../../../services/composicion-pasajeros';

@Component({
  selector: 'app-reserva-plan',
  standalone: true,
  imports: [CurrencyPipe, ReactiveFormsModule],
  templateUrl: './reserva-plan.html',
  styleUrl: './reserva-plan.css'
})
export class ReservaPlanComponent {
  readonly items = input.required<PlanDiaItem[]>();
  private readonly api = inject(ReservaPlanService);
  private readonly reservas = inject(ReservasService);
  private readonly destroy = inject(DestroyRef);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('checkout');
  readonly seleccionados = signal<PlanDiaItem[]>([]);
  readonly resumen = signal<PlanResumen | null>(null);
  readonly consultando = signal(false);
  readonly procesando = signal(false);
  readonly incierto = signal(false);
  readonly error = signal('');
  readonly resultado = signal<PlanPagoRespuesta | null>(null);
  readonly metodo = signal<MetodoPago>('TARJETA');
  readonly adicionalesDisponibles = signal<Adicional[]>([]);
  readonly adicionalesSeleccionados = signal<number[]>([]);
  readonly cargandoAdicionales = signal(false);
  readonly errorAdicionales = signal('');
  readonly cantidades = signal<CantidadesPasajeros>({ ninos: 0, adultos: 1, adultosMayores: 0 });
  readonly tarifasPasajeros = signal<TarifaPasajero[]>([]);
  readonly cargandoTarifas = signal(false);
  readonly errorTarifas = signal('');
  private readonly cupos = signal<Partial<Record<number, number>>>({});
  readonly pasajeros = new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(100), Validators.pattern(/^\d+$/)] });
  readonly tarjeta = new FormGroup({
    numero: new FormControl('', { nonNullable: true, validators: [Validators.required, validarLuhn] }),
    titular: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    mes: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(12), Validators.pattern(/^\d{1,2}$/)] }),
    anio: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(9999), Validators.pattern(/^\d{4}$/)] }),
    cvv: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{3,4}$/)] })
  });
  readonly yape = new FormGroup({
    celular: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^9\d{8}$/)] }),
    codigoAprobacion: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] })
  });
  private consulta?: Subscription;
  private consultaAdicionales?: Subscription;
  private operacionId = '';
  private peticionPendiente?: PlanPagoSolicitud;

  constructor() {
    this.pasajeros.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.error.set('');
      this.actualizarResumen();
    });
  }

  abrir(): void {
    if (!this.incierto()) {
      this.seleccionados.set([...this.items()]);
      this.resultado.set(null);
      this.error.set('');
      this.pasajeros.setValue(1, { emitEvent: false });
      this.cantidades.set({ ninos: 0, adultos: 1, adultosMayores: 0 });
      this.cupos.set({});
      this.cargarTarifas();
      this.operacionId = crypto.randomUUID();
      this.peticionPendiente = undefined;
      this.adicionalesSeleccionados.set([]);
      this.cargarAdicionales();
      this.actualizarResumen();
    }
    this.dialog()?.nativeElement.showModal();
  }

  cerrar(): void {
    if (this.procesando() || this.incierto()) return;
    this.dialog()?.nativeElement.close();
    this.peticionPendiente = undefined;
    this.tarjeta.reset();
    this.yape.reset();
  }

  quitar(salidaId: number): void {
    if (this.procesando() || this.incierto() || this.resultado()?.estadoPago === 'APROBADO') return;
    this.seleccionados.update(items => items.filter(i => i.salidaId !== salidaId));
    this.error.set('');
    this.actualizarResumen();
  }

  cantidad(tipo: TipoPasajero): number {
    return cantidadPasajero(this.cantidades(), tipo);
  }

  limitePasajeros(): number {
    return Math.min(100, ...this.seleccionados().map(i => this.cupos()[i.salidaId] ?? 100));
  }

  cambiarCantidad(tipo: TipoPasajero, cambio: number): void {
    if (this.procesando() || this.incierto() || this.resultado()?.estadoPago === 'APROBADO') return;
    // Permitir reducir un grupo si los cupos bajaron desde la consulta anterior.
    const limite = cambio < 0 ? Math.max(this.pasajeros.value, this.limitePasajeros()) : this.limitePasajeros();
    const composicion = cambiarComposicionPasajeros(this.cantidades(), tipo, cambio, this.pasajeros.value, limite);
    if (!composicion) return;
    this.cantidades.set(composicion);
    this.pasajeros.setValue(composicion.ninos + composicion.adultos + composicion.adultosMayores);
  }

  cargarTarifas(): void {
    if (this.cargandoTarifas() || this.procesando() || this.incierto()) return;
    this.cargandoTarifas.set(true);
    this.errorTarifas.set('');
    this.reservas.tarifas().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: tarifas => { this.tarifasPasajeros.set(tarifas); this.cargandoTarifas.set(false); },
      error: () => { this.errorTarifas.set('No pudimos cargar las tarifas de pasajeros. Inténtalo nuevamente.'); this.cargandoTarifas.set(false); }
    });
  }

  cargarAdicionales(): void {
    if (this.procesando() || this.incierto()) return;
    this.consultaAdicionales?.unsubscribe();
    this.adicionalesDisponibles.set([]);
    this.errorAdicionales.set('');
    const tourId = this.seleccionados()[0]?.tourId;
    if (!tourId) { this.cargandoAdicionales.set(false); return; }
    this.cargandoAdicionales.set(true);
    this.consultaAdicionales = this.reservas.adicionalesPorTour(tourId).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: adicionales => {
        this.adicionalesDisponibles.set(adicionales);
        this.adicionalesSeleccionados.update(ids => ids.filter(id => adicionales.some(a => a.id === id)));
        this.cargandoAdicionales.set(false);
        this.actualizarResumen();
      },
      error: () => { this.errorAdicionales.set('No pudimos cargar los adicionales del plan.'); this.cargandoAdicionales.set(false); }
    });
  }

  seleccionarAdicional(id: number): void {
    if (this.procesando() || this.incierto() || this.cargandoAdicionales()) return;
    this.adicionalesSeleccionados.update(ids => ids.includes(id) ? ids.filter(actual => actual !== id) : [...ids, id]);
    this.error.set('');
    this.actualizarResumen();
  }

  adicionalesConfirmados(): ReservaAdicional[] {
    const agrupados = new Map<number, ReservaAdicional>();
    for (const reserva of this.resultado()?.reservas ?? []) {
      for (const adicional of reserva.adicionales ?? []) {
        const anterior = agrupados.get(adicional.adicionalId);
        agrupados.set(adicional.adicionalId, anterior
          ? { ...anterior, cantidad: anterior.cantidad + adicional.cantidad, subtotal: anterior.subtotal + adicional.subtotal }
          : { ...adicional });
      }
    }
    return [...agrupados.values()];
  }

  detalleAdicional(id: number): ReservaAdicional | undefined {
    return this.resumen()?.adicionales.find(a => a.adicionalId === id);
  }

  actualizarResumen(): void {
    if (this.procesando() || this.incierto()) return;
    this.consulta?.unsubscribe();
    this.resumen.set(null);
    this.consultando.set(false);
    if (this.pasajeros.invalid || !this.seleccionados().length) return;
    this.consultando.set(true);
    this.consulta = this.api.resumen({ composicion: { ...this.cantidades() }, adicionalesIds: this.adicionalesSeleccionados(), items: this.seleccionados().map(i => ({ salidaId: i.salidaId })) })
      .pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next: resumen => {
          this.resumen.set(resumen);
          this.cupos.update(actual => ({ ...actual, ...Object.fromEntries(resumen.items.map(i => [i.salidaId, i.cuposDisponibles])) }));
          this.consultando.set(false);
        },
        error: (e: HttpErrorResponse) => { this.error.set(e.error?.detail || 'No pudimos validar todas las salidas. Actualiza la disponibilidad.'); this.consultando.set(false); }
      });
  }

  tarjetaVencida(): boolean {
    const { mes, anio } = this.tarjeta.getRawValue();
    const fechaLima = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
    const actualAnio = Number(fechaLima.find(p => p.type === 'year')?.value);
    const actualMes = Number(fechaLima.find(p => p.type === 'month')?.value);
    return Number(anio) < actualAnio || (Number(anio) === actualAnio && Number(mes) < actualMes);
  }

  puedePagar(): boolean {
    if (this.procesando() || this.resultado()?.estadoPago === 'APROBADO') return false;
    if (this.incierto()) return !!this.peticionPendiente;
    return !this.consultando() && !this.cargandoAdicionales() && !this.errorAdicionales()
      && !this.cargandoTarifas() && !this.errorTarifas() && this.tarifasPasajeros().length > 0
      && !!this.resumen()?.disponible && this.pasajeros.valid
      && (this.metodo() === 'TARJETA' ? this.tarjeta.valid && !this.tarjetaVencida() : this.yape.valid);
  }

  pagar(): void {
    if (!this.puedePagar()) return;
    if (!this.incierto()) {
      const tarjeta = this.tarjeta.getRawValue();
      this.peticionPendiente = {
        operacionId: this.operacionId,
        seleccion: { composicion: { ...this.cantidades() }, adicionalesIds: [...this.adicionalesSeleccionados()],
          subtotalAdicionalesEsperado: this.resumen()!.subtotalAdicionales,
          items: this.resumen()!.items.map(i => ({ salidaId: i.salidaId, precioEsperado: i.subtotal })) },
        pago: this.metodo() === 'TARJETA'
          ? { metodo: 'TARJETA', tarjeta: { ...tarjeta, numero: tarjeta.numero.replace(/\s/g, ''), mes: Number(tarjeta.mes), anio: Number(tarjeta.anio) } }
          : { metodo: 'YAPE', yape: this.yape.getRawValue() }
      };
    }
    this.procesando.set(true);
    this.error.set('');
    const inicio = Date.now();
    this.api.pagar(this.peticionPendiente!).pipe(
      materialize(),
      concatMap(notificacion => timer(Math.max(0, 3000 - (Date.now() - inicio)))
        .pipe(map(() => notificacion))),
      dematerialize(),
      takeUntilDestroyed(this.destroy),
      finalize(() => this.procesando.set(false))
    ).subscribe({
      next: resultado => {
        this.procesando.set(false);
        this.incierto.set(false);
        this.resultado.set(resultado);
        this.peticionPendiente = undefined;
        if (resultado.estadoPago === 'APROBADO') { this.tarjeta.reset(); this.yape.reset(); }
        else { this.error.set(resultado.mensaje); this.actualizarResumen(); }
      },
      error: (e: HttpErrorResponse) => {
        this.procesando.set(false);
        // Si se perdió la respuesta, conservar la misma operación evita duplicar reservas al reintentar.
        this.incierto.set(e.status === 0 || e.status === 408 || e.status >= 500);
        this.error.set(this.incierto()
          ? 'No pudimos confirmar la respuesta del pago. Revisa tus reservas antes de intentarlo nuevamente.'
          : e.error?.detail || 'No se pudo reservar el plan. Revisa los datos e inténtalo nuevamente.');
        if (!this.incierto()) this.actualizarResumen();
      }
    });
  }
}
