import { UbicacionTour } from '../../ubicacion-tour/ubicacion-tour';
import {
  Component,
  DestroyRef,
  HostListener,
  Input,
  PLATFORM_ID,
  inject,
  signal
} from '@angular/core';

import {
  CurrencyPipe,
  DatePipe,
  isPlatformBrowser
} from '@angular/common';

import {
  IntelligenceService,
  RecomendacionIntelligence,
  PlanDiaRespuesta
} from '../../../services/intelligence.service';

import { RouterLink } from '@angular/router';
import { PronosticoMarino } from '../pronostico-marino/pronostico-marino';

import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  Subscription,
  catchError,
  forkJoin,
  map,
  of,
  switchMap
} from 'rxjs';

import {
  Tours
} from '../../../services/tours';

import {
  SalidaProgramada,
  SalidasService
} from '../../../services/salidas.service';

import {
  EmbarcacionPublica,
  EmbarcacionesService
} from '../../../services/embarcaciones.service';

import {
  Reserva,
  Adicional,
  TipoPasajero,
  TarifaPasajero,
  ReservasService,
  errorReserva
} from '../../../services/reservas.service';

import {
  MetodoPago,
  PagoRespuesta,
  PagosService
} from '../../../services/pagos.service';

import { HttpErrorResponse } from '@angular/common/http';


interface TourDestacadoConSalida {
  zonaMaritima?: import('../../../services/tours').ZonaMaritimaTour | null;
  id: number;
  nombre: string;
  descripcion: string;
  duracionMinutos: number;
  precioBase: number;
  activo: boolean;
  categoriaId: number;
  imagenUrl: string | null;

  categoria?: {
    id: number;
    nombre: string;
    descripcion?: string | null;
  } | null;

  proximaSalida: SalidaProgramada | null;
  salidas: SalidaProgramada[];
  errorSalida: boolean;
}


function validarLuhn(
  control: AbstractControl
): ValidationErrors | null {

  const numero =
    String(control.value ?? '')
      .replace(/\s/g, '');

  if (!/^\d{13,19}$/.test(numero)) {
    return { tarjeta: true };
  }

  let suma = 0;
  let duplicar = false;

  for (
    let i = numero.length - 1;
    i >= 0;
    i--
  ) {

    let digito = Number(numero[i]);

    if (duplicar) {
      digito *= 2;

      if (digito > 9) {
        digito -= 9;
      }
    }

    suma += digito;
    duplicar = !duplicar;
  }

  return suma % 10 === 0
    ? null
    : { luhn: true };
}


@Component({
  selector: 'app-recomendaciones',
  standalone: true,

  imports: [UbicacionTour,
    RouterLink,
    PronosticoMarino,
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule
  ],

  templateUrl: './recomendaciones.html',
  styleUrl: './recomendaciones.css'
})
export class RecomendacionesComponent {

  @Input() soloDetalle = false;

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly navegador =
    isPlatformBrowser(
      inject(PLATFORM_ID)
    );

  readonly toursService =
    inject(Tours);

  private readonly salidasService =
    inject(SalidasService);

  private readonly intelligenceService =
    inject(IntelligenceService);

  readonly embarcacionesService =
    inject(EmbarcacionesService);

  private readonly reservasService =
    inject(ReservasService);

  private readonly pagosService =
    inject(PagosService);


  // =========================================================
  // TOURS
  // =========================================================

  readonly toursDestacados =
    signal<TourDestacadoConSalida[]>([]);

  readonly cargandoTours =
    signal(false);

  readonly errorTours =
    signal('');

  readonly imagenesToursFallidas =
    signal<Set<number>>(new Set());

  readonly recomendacionesIntelligence =
    signal<RecomendacionIntelligence[]>([]);

  readonly cargandoIntelligence =
    signal(false);

  readonly errorIntelligence =
    signal('');

    readonly planDia =
  signal<PlanDiaRespuesta | null>(null);

readonly cargandoPlanDia =
  signal(false);

readonly errorPlanDia =
  signal(false);

readonly fechaPlanDia = signal(
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
);

readonly zonasPlanDia: { valor: import('../../../services/tours').ZonaMaritimaTour; nombre: string }[] = [
  { valor: 'MANCORA', nombre: 'Máncora' },
  { valor: 'LOS_ORGANOS', nombre: 'Los Órganos' },
  { valor: 'CABO_BLANCO', nombre: 'Cabo Blanco' },
  { valor: 'TALARA', nombre: 'Talara' }
];
readonly zonaPlanDia = signal<import('../../../services/tours').ZonaMaritimaTour>('MANCORA');

private consultaPlanDia?: Subscription;


  // =========================================================
  // MODAL
  // =========================================================

  readonly tourSeleccionado =
    signal<TourDestacadoConSalida | null>(
      null
    );

  readonly salidaSeleccionada =
    signal<SalidaProgramada | null>(
      null
    );

  readonly modalAbierto =
    signal(false);

  readonly modoReserva =
    signal(false);


  // =========================================================
  // CHECKOUT
  // =========================================================

  readonly pasoCheckout =
    signal<'RESERVA' | 'PAGO' | 'CONFIRMACION'>(
      'RESERVA'
    );

  readonly reservaPendiente =
    signal<Reserva | null>(
      null
    );

  readonly creandoReserva =
    signal(false);

  readonly procesandoPago =
    signal(false);

  readonly errorCheckout =
    signal('');

  readonly pagoRechazado =
    signal<PagoRespuesta | null>(
      null
    );

  readonly pagoConfirmado =
    signal<PagoRespuesta | null>(
      null
    );

  readonly metodoPago =
    signal<MetodoPago>(
      'TARJETA'
    );


  // =========================================================
  // PASAJEROS
  // =========================================================

  readonly pasajeros =
    new FormControl(
      1,
      {
        nonNullable: true,

        validators: [
          Validators.required,
          Validators.min(1),
          Validators.pattern(/^\d+$/)
        ]
      }
    );

  readonly tarifasPasajeros =
    signal<TarifaPasajero[]>([]);

  readonly cargandoTarifas =
    signal(false);

  readonly errorTarifas =
    signal('');

  readonly adicionalesDisponibles =
    signal<Adicional[]>([]);

  readonly adicionalesSeleccionados =
    signal<number[]>([]);

  readonly cargandoAdicionales =
    signal(false);

  readonly errorAdicionales =
    signal('');

  private consultaAdicionales?: Subscription;


  cargarAdicionales(): void {

    const salida =
      this.salidaSeleccionada();

    if (
      !salida ||
      this.creandoReserva() ||
      this.reservaPendiente()
    ) {
      return;
    }

    this.consultaAdicionales
      ?.unsubscribe();

    this.adicionalesDisponibles
      .set([]);

    this.adicionalesSeleccionados
      .set([]);

    this.errorAdicionales
      .set('');

    this.cargandoAdicionales
      .set(true);

    this.consultaAdicionales =
      this.reservasService
        .adicionalesPorTour(
          salida.tourId
        )
        .pipe(
          takeUntilDestroyed(
            this.destroyRef
          )
        )
        .subscribe({

          next: adicionales => {

            this.adicionalesDisponibles
              .set(adicionales);

            this.cargandoAdicionales
              .set(false);
          },

          error: () => {

            this.errorAdicionales.set(
              'No pudimos cargar los adicionales de este tour.'
            );

            this.cargandoAdicionales
              .set(false);
          }

        });
  }


  seleccionarAdicional(
    id: number
  ): void {

    if (
      this.creandoReserva() ||
      this.reservaPendiente() ||
      this.cargandoAdicionales()
    ) {
      return;
    }

    if (
      !this.adicionalesDisponibles()
        .some(
          adicional =>
            adicional.id === id
        )
    ) {
      return;
    }

    this.adicionalesSeleccionados
      .update(ids =>
        ids.includes(id)
          ? ids.filter(
              item => item !== id
            )
          : [...ids, id]
      );
  }


  subtotalAdicionales(): number {

    const seleccionados =
      this.adicionalesSeleccionados();

    return (
      this.adicionalesDisponibles()
        .filter(
          adicional =>
            seleccionados.includes(
              adicional.id
            )
        )
        .reduce(
          (suma, adicional) =>
            suma +
            Math.round(
              adicional.precio * 100
            ) *
            (
              adicional.tipoCobro ===
              'POR_PERSONA'
                ? this.pasajeros.value
                : 1
            ),
          0
        ) / 100
    );
  }


  readonly cantidades =
    signal({
      ninos: 0,
      adultos: 1,
      adultosMayores: 0
    });


  cantidad(
    tipo: TipoPasajero
  ): number {

    const cantidades =
      this.cantidades();

    return tipo === 'NINO'
      ? cantidades.ninos
      : tipo === 'ADULTO'
        ? cantidades.adultos
        : cantidades.adultosMayores;
  }


  cambiarCantidad(
    tipo: TipoPasajero,
    cambio: number
  ): void {

    if (
      this.creandoReserva() ||
      this.reservaPendiente()
    ) {
      return;
    }

    const cantidad =
      this.cantidad(tipo) + cambio;

    const total =
      this.pasajeros.value + cambio;

    if (
      cantidad < 0 ||
      total < 0 ||
      total >
        (
          this.salidaSeleccionada()
            ?.cuposDisponibles ?? 0
        )
    ) {
      return;
    }

    const clave =
      tipo === 'NINO'
        ? 'ninos'
        : tipo === 'ADULTO'
          ? 'adultos'
          : 'adultosMayores';

    this.cantidades.update(
      cantidades => ({
        ...cantidades,
        [clave]: cantidad
      })
    );

    this.pasajeros.setValue(
      total
    );
  }


  cargarTarifas(): void {

    if (
      this.cargandoTarifas()
    ) {
      return;
    }

    this.cargandoTarifas
      .set(true);

    this.errorTarifas
      .set('');

    this.reservasService
      .tarifas()
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: tarifas => {

          this.tarifasPasajeros
            .set(tarifas);

          this.cargandoTarifas
            .set(false);
        },

        error: () => {

          this.cargandoTarifas
            .set(false);

          this.errorTarifas.set(
            'No pudimos cargar las tarifas de pasajeros. Inténtalo nuevamente.'
          );
        }

      });
  }


  precioPasajero(
    tipo: TipoPasajero
  ): number {

    const tarifa =
      this.tarifasPasajeros()
        .find(
          tarifa =>
            tarifa.tipo === tipo
        );

    if (!tarifa) {
      return 0;
    }

    const centimosBase =
      Math.round(
        (
          this.salidaSeleccionada()
            ?.precioPorPasajero ?? 0
        ) * 100
      );

    return (
      Math.round(
        centimosBase *
        (
          100 -
          tarifa.porcentajeDescuento
        ) / 100
      ) / 100
    );
  }


  puedeContinuarReserva(): boolean {

    return (
      !!this.salidaSeleccionada() &&
      !this.creandoReserva() &&
      !this.cargandoTarifas() &&
      !this.errorTarifas() &&
      this.tarifasPasajeros().length > 0 &&
      !this.cargandoAdicionales() &&
      !this.errorAdicionales() &&
      this.pasajeros.valid
    );
  }


  // =========================================================
  // TARJETA
  // =========================================================

  readonly numeroTarjeta =
    new FormControl(
      '',
      {
        nonNullable: true,

        validators: [
          Validators.required,
          validarLuhn
        ]
      }
    );

  readonly titularTarjeta =
    new FormControl(
      '',
      {
        nonNullable: true,

        validators: [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(80)
        ]
      }
    );

  readonly mesTarjeta =
    new FormControl(
      '',
      {
        nonNullable: true,

        validators: [
          Validators.required,
          Validators.pattern(
            /^(0?[1-9]|1[0-2])$/
          )
        ]
      }
    );

  readonly anioTarjeta =
    new FormControl(
      '',
      {
        nonNullable: true,

        validators: [
          Validators.required,
          Validators.pattern(
            /^\d{4}$/
          )
        ]
      }
    );

  readonly cvvTarjeta =
    new FormControl(
      '',
      {
        nonNullable: true,

        validators: [
          Validators.required,
          Validators.pattern(
            /^\d{3,4}$/
          )
        ]
      }
    );


  // =========================================================
  // YAPE
  // =========================================================

  readonly celularYape =
    new FormControl(
      '',
      {
        nonNullable: true,

        validators: [
          Validators.required,
          Validators.pattern(
            /^9\d{8}$/
          )
        ]
      }
    );

  readonly codigoYape =
    new FormControl(
      '',
      {
        nonNullable: true,

        validators: [
          Validators.required,
          Validators.pattern(
            /^\d{6}$/
          )
        ]
      }
    );


  // =========================================================
  // EMBARCACIÓN
  // =========================================================

  readonly embarcacion =
    signal<EmbarcacionPublica | null>(
      null
    );

  readonly cargandoEmbarcacion =
    signal(false);

  readonly errorEmbarcacion =
    signal('');

  readonly fichaEmbarcacionAbierta =
    signal(false);

  readonly imagenEmbarcacion =
    signal<string | null>(
      null
    );

  readonly imagenEmbarcacionFallida =
    signal(false);


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    if (!this.navegador) {
      return;
    }

    if (!this.soloDetalle) {
      this.cargarIntelligence();
      this.cargarPlanDia();
    }

    this.cargarTarifas();
  }


  // =========================================================
  // TOURS / INTELLIGENCE
  // =========================================================

  cargarIntelligence(): void {

    if (
      this.cargandoIntelligence()
    ) {
      return;
    }

    this.cargandoIntelligence
      .set(true);

    this.cargandoTours
      .set(true);

    this.errorIntelligence
      .set('');

    this.errorTours
      .set('');

    this.intelligenceService
      .recomendaciones()
      .pipe(

        switchMap(
          recomendaciones => {

            const top =
              recomendaciones.slice(
                0,
                3
              );

            this.recomendacionesIntelligence
              .set(top);

            if (
              top.length === 0
            ) {
              return of<
                TourDestacadoConSalida[]
              >([]);
            }

            return this.toursService
              .listarActivos()
              .pipe(

                switchMap(
                  tours => {

                    const recomendados =
                      top
                        .map(
                          recomendacion => {

                            const tour =
                              tours.find(
                                item =>
                                  item.id ===
                                  recomendacion.tourId
                              );

                            return (
                              tour ?? null
                            );
                          }
                        )
                        .filter(
                          (
                            tour
                          ): tour is NonNullable<
                            typeof tour
                          > =>
                            tour !== null
                        );

                    if (
                      recomendados.length === 0
                    ) {
                      return of<
                        TourDestacadoConSalida[]
                      >([]);
                    }

                    return forkJoin(

                      recomendados.map(
                        tour =>

                          this.salidasService
                            .listarDisponiblesPorTour(
                              tour.id
                            )
                            .pipe(

                              map(
                                salidas => {

                                  const ordenadas =
                                    [...salidas]
                                      .sort(
                                        (
                                          a,
                                          b
                                        ) =>
                                          `${a.fecha}T${a.horaSalida}`
                                            .localeCompare(
                                              `${b.fecha}T${b.horaSalida}`
                                            )
                                      );

                                  const resultado:
                                    TourDestacadoConSalida =
                                  {
                                    ...tour,

                                    categoria:
                                      null,

                                    salidas:
                                      ordenadas,

                                    proximaSalida:
                                      ordenadas[0]
                                      ?? null,

                                    errorSalida:
                                      false
                                  };

                                  return resultado;
                                }
                              ),

                              catchError(
                                () => {

                                  const resultado:
                                    TourDestacadoConSalida =
                                  {
                                    ...tour,

                                    categoria:
                                      null,

                                    salidas:
                                      [],

                                    proximaSalida:
                                      null,

                                    errorSalida:
                                      true
                                  };

                                  return of(
                                    resultado
                                  );
                                }
                              )

                            )

                      )

                    );
                  }
                )

              );
          }
        ),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: tours => {

          this.toursDestacados
            .set(tours);

          this.imagenesToursFallidas
            .set(
              new Set()
            );

          this.cargandoIntelligence
            .set(false);

          this.cargandoTours
            .set(false);
        },

        error: () => {

          this.errorIntelligence
            .set(
              'No pudimos cargar tus recomendaciones.'
            );

          this.cargandoIntelligence
            .set(false);

          this.cargandoTours
            .set(false);
        }

      });
  }

descansoEntreExperiencias(indice: number): { inicio: string; fin: string } | null {
  const items = this.planDia()?.items;
  const actual = items?.[indice];
  const siguiente = items?.[indice + 1];
  if (!actual || !siguiente) return null;

  // El backend devuelve fechas/horas locales de Lima: comparar sin convertir la zona.
  const fecha = siguiente.horaInicio.slice(0, 10);
  const inicioFranja = `${fecha}T12:30:00`;
  const finFranja = `${fecha}T15:30:00`;
  const finExperiencia = actual.horaFin;
  const inicioSiguiente = siguiente.horaInicio;
  const inicio = finExperiencia > inicioFranja ? finExperiencia : inicioFranja;
  const fin = inicioSiguiente < finFranja ? inicioSiguiente : finFranja;
  return inicio < fin ? { inicio, fin } : null;
}

cambiarFechaPlanDia(fecha: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha === this.fechaPlanDia()) return;
  this.fechaPlanDia.set(fecha);
  this.cargarPlanDia();
}

cambiarZonaPlanDia(valor: string): void {
  const zona = this.zonasPlanDia.find(zona => zona.valor === valor);
  if (!zona || zona.valor === this.zonaPlanDia()) return;
  this.zonaPlanDia.set(zona.valor);
  this.cargarPlanDia();
}

cargarPlanDia(): void {
  this.consultaPlanDia?.unsubscribe();
  this.planDia.set(null);
  this.cargandoPlanDia.set(true);
  this.errorPlanDia.set(false);

  this.consultaPlanDia = this.intelligenceService.planDia(this.fechaPlanDia(), this.zonaPlanDia())
    .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
    next: (plan) => {
      this.planDia.set(plan);
      this.cargandoPlanDia.set(false);
    },
    error: () => {
      this.errorPlanDia.set(true);
      this.cargandoPlanDia.set(false);
    }
  });
}
  // =========================================================
  // DETALLE
  // =========================================================

  tourPorId(
    id: number
  ): TourDestacadoConSalida | null {

    return (
      this.toursDestacados()
        .find(
          tour =>
            tour.id === id
        ) ?? null
    );
  }

fechaHoraRecomendada(tour: TourDestacadoConSalida, salidaId: number | null): string | null {
  const salida = tour.salidas.find(item => item.id === salidaId) ?? tour.proximaSalida;
  return salida ? `${salida.fecha}T${salida.horaSalida}` : null;
}

ringOffset(score: number): number {
  const porcentaje = Math.max(0, Math.min(100, score));
  const radio = 18;
  const circunferencia = 2 * Math.PI * radio;
  return circunferencia * (1 - porcentaje / 100);
}
  abrirDetalle(
    tour: TourDestacadoConSalida
  ): void {

    this.tourSeleccionado.set(
      tour
    );

    this.salidaSeleccionada.set(
      null
    );

    this.modalAbierto.set(
      true
    );

    this.modoReserva.set(
      false
    );

    this.reiniciarCheckout();

    this.cerrarFichaEmbarcacion();
  }


  cerrarDetalle(): void {

    this.modalAbierto.set(
      false
    );

    this.modoReserva.set(
      false
    );

    this.salidaSeleccionada.set(
      null
    );

    this.cerrarFichaEmbarcacion();

    this.reiniciarFormularioPago();
  }


  seleccionarSalida(
    salida: SalidaProgramada
  ): void {

    if (
      !salida.reservable ||
      salida.cuposDisponibles <= 0
    ) {
      return;
    }

    this.salidaSeleccionada.set(
      salida
    );

    this.pasajeros.setValue(
      1
    );

    this.pasajeros.setValidators([
      Validators.required,
      Validators.min(1),

      Validators.max(
        salida.cuposDisponibles
      ),

      Validators.pattern(
        /^\d+$/
      )
    ]);

    this.pasajeros
      .updateValueAndValidity();

    this.reiniciarCheckout();

    this.cargarAdicionales();

    this.modoReserva.set(
      true
    );
  }


  volverDetalle(): void {

    /*
     * Una reserva PENDIENTE ya retiene cupos.
     * No permitimos cambiar de salida después
     * de crearla desde este flujo.
     */

    if (
      this.reservaPendiente()
    ) {
      return;
    }

    this.modoReserva.set(
      false
    );

    this.cerrarFichaEmbarcacion();
  }


  // =========================================================
  // RESERVA
  // =========================================================

  continuarReserva(): void {

    if (
      !this.puedeContinuarReserva()
    ) {
      return;
    }

    const salida =
      this.salidaSeleccionada();

    if (
      !salida ||
      this.pasajeros.invalid ||
      this.creandoReserva()
    ) {
      return;
    }

    if (
      this.reservaPendiente()
    ) {

      this.pasoCheckout.set(
        'PAGO'
      );

      return;
    }

    this.creandoReserva.set(
      true
    );

    this.errorCheckout.set(
      ''
    );

    this.reservasService
      .crear(
        salida.id,
        this.cantidades(),
        this.total(),
        this.adicionalesSeleccionados()
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: reserva => {

          this.reservaPendiente.set(
            reserva
          );

          this.creandoReserva.set(
            false
          );

          this.pasoCheckout.set(
            'PAGO'
          );
        },

        error: (
          error: HttpErrorResponse
        ) => {

          this.errorCheckout.set(
            errorReserva(error)
          );

          this.creandoReserva.set(
            false
          );
        }

      });
  }


  // =========================================================
  // PAGO
  // =========================================================

  seleccionarMetodo(
    metodo: MetodoPago
  ): void {

    this.metodoPago.set(
      metodo
    );

    this.errorCheckout.set(
      ''
    );

    this.pagoRechazado.set(
      null
    );
  }


  tarjetaExpirada(): boolean {

    const mes =
      Number(
        this.mesTarjeta.value
      );

    const anio =
      Number(
        this.anioTarjeta.value
      );

    if (
      !mes ||
      !anio
    ) {
      return false;
    }

    const ahora =
      new Date();

    const anioActual =
      ahora.getFullYear();

    const mesActual =
      ahora.getMonth() + 1;

    return (
      anio < anioActual ||
      (
        anio === anioActual &&
        mes < mesActual
      )
    );
  }


  pagoTarjetaValido(): boolean {

    return (
      this.numeroTarjeta.valid &&
      this.titularTarjeta.valid &&
      this.mesTarjeta.valid &&
      this.anioTarjeta.valid &&
      this.cvvTarjeta.valid &&
      !this.tarjetaExpirada()
    );
  }


  pagoYapeValido(): boolean {

    return (
      this.celularYape.valid &&
      this.codigoYape.valid
    );
  }


  puedePagar(): boolean {

    if (
      !this.reservaPendiente() ||
      this.procesandoPago()
    ) {
      return false;
    }

    return this.metodoPago()
      === 'TARJETA'
        ? this.pagoTarjetaValido()
        : this.pagoYapeValido();
  }


  pagar(): void {

    const reserva =
      this.reservaPendiente();

    if (
      !reserva ||
      !this.puedePagar()
    ) {

      this.marcarPagoTocado();

      return;
    }

    this.procesandoPago.set(
      true
    );

    this.errorCheckout.set(
      ''
    );

    this.pagoRechazado.set(
      null
    );

    const peticion =
      this.metodoPago()
        === 'TARJETA'

        ? this.pagosService
            .pagarConTarjeta(
              reserva.id,
              {
                numero:
                  this.numeroTarjeta.value
                    .replace(
                      /\s/g,
                      ''
                    ),

                mes:
                  Number(
                    this.mesTarjeta.value
                  ),

                anio:
                  Number(
                    this.anioTarjeta.value
                  ),

                cvv:
                  this.cvvTarjeta.value,

                titular:
                  this.titularTarjeta.value
                    .trim()
              }
            )

        : this.pagosService
            .pagarConYape(
              reserva.id,
              {
                celular:
                  this.celularYape.value,

                codigoAprobacion:
                  this.codigoYape.value
              }
            );

    peticion
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: resultado => {

          this.procesandoPago.set(
            false
          );

          if (
            resultado.estadoPago
              === 'APROBADO'
          ) {

            this.pagoConfirmado.set(
              resultado
            );

            this.pagoRechazado.set(
              null
            );

            this.pasoCheckout.set(
              'CONFIRMACION'
            );

            return;
          }

          this.pagoRechazado.set(
            resultado
          );
        },

        error: (
          error: HttpErrorResponse
        ) => {

          this.procesandoPago.set(
            false
          );

          this.errorCheckout.set(
            error.error?.detail
              || error.error?.message
              || 'No se pudo procesar el pago. Inténtalo nuevamente.'
          );
        }

      });
  }


  private marcarPagoTocado(): void {

    if (
      this.metodoPago()
        === 'TARJETA'
    ) {

      this.numeroTarjeta
        .markAsTouched();

      this.titularTarjeta
        .markAsTouched();

      this.mesTarjeta
        .markAsTouched();

      this.anioTarjeta
        .markAsTouched();

      this.cvvTarjeta
        .markAsTouched();

      return;
    }

    this.celularYape
      .markAsTouched();

    this.codigoYape
      .markAsTouched();
  }


  // =========================================================
  // PASAJEROS
  // =========================================================

  total(): number {

    return (
      Math.round(
        this.subtotalPasajeros()
        * 100
      )
      +
      Math.round(
        this.subtotalAdicionales()
        * 100
      )
    ) / 100;
  }


  subtotalPasajeros(): number {

    return (
      this.tarifasPasajeros()
        .reduce(
          (
            total,
            tarifa
          ) =>
            total +
            Math.round(
              this.precioPasajero(
                tarifa.tipo
              ) * 100
            ) *
            this.cantidad(
              tarifa.tipo
            ),
          0
        ) / 100
    );
  }


  // =========================================================
  // EMBARCACIÓN
  // =========================================================

  abrirEmbarcacion(
    salida: SalidaProgramada,
    event?: Event
  ): void {

    event?.stopPropagation();

    this.limpiarImagenEmbarcacion();

    this.embarcacion.set(
      null
    );

    this.errorEmbarcacion.set(
      ''
    );

    this.imagenEmbarcacionFallida.set(
      false
    );

    this.cargandoEmbarcacion.set(
      true
    );

    this.fichaEmbarcacionAbierta.set(
      true
    );

    this.embarcacionesService
      .obtenerPublicaPorId(
        salida.embarcacionId
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: embarcacion => {

          this.embarcacion.set(
            embarcacion
          );

          this.cargandoEmbarcacion.set(
            false
          );

          if (
            embarcacion.imagenUrl
          ) {

            this.cargarImagenEmbarcacion(
              embarcacion.imagenUrl
            );
          }
        },

        error: () => {

          this.errorEmbarcacion.set(
            'No pudimos cargar la información de esta embarcación.'
          );

          this.cargandoEmbarcacion.set(
            false
          );
        }

      });
  }


  private cargarImagenEmbarcacion(
    imagenUrl: string
  ): void {

    this.embarcacionesService
      .obtenerImagen(
        imagenUrl
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: blob => {

          this.limpiarImagenEmbarcacion();

          this.imagenEmbarcacion.set(
            URL.createObjectURL(
              blob
            )
          );
        },

        error: () => {

          this.imagenEmbarcacionFallida.set(
            true
          );
        }

      });
  }


  cerrarFichaEmbarcacion(): void {

    this.fichaEmbarcacionAbierta.set(
      false
    );

    this.embarcacion.set(
      null
    );

    this.errorEmbarcacion.set(
      ''
    );

    this.cargandoEmbarcacion.set(
      false
    );

    this.imagenEmbarcacionFallida.set(
      false
    );

    this.limpiarImagenEmbarcacion();
  }


  private limpiarImagenEmbarcacion(): void {

    const actual =
      this.imagenEmbarcacion();

    if (actual) {

      URL.revokeObjectURL(
        actual
      );
    }

    this.imagenEmbarcacion.set(
      null
    );
  }


  // =========================================================
  // RESET
  // =========================================================

  private reiniciarCheckout(): void {

    this.consultaAdicionales
      ?.unsubscribe();

    this.adicionalesDisponibles
      .set([]);

    this.adicionalesSeleccionados
      .set([]);

    this.cargandoAdicionales
      .set(false);

    this.errorAdicionales
      .set('');

    this.cantidades.set({
      ninos: 0,
      adultos: 1,
      adultosMayores: 0
    });

    this.pasajeros.setValue(
      1
    );

    this.pasoCheckout.set(
      'RESERVA'
    );

    this.reservaPendiente.set(
      null
    );

    this.creandoReserva.set(
      false
    );

    this.procesandoPago.set(
      false
    );

    this.errorCheckout.set(
      ''
    );

    this.pagoRechazado.set(
      null
    );

    this.pagoConfirmado.set(
      null
    );

    this.metodoPago.set(
      'TARJETA'
    );

    this.reiniciarFormularioPago();
  }


  private reiniciarFormularioPago(): void {

    this.numeroTarjeta.reset(
      ''
    );

    this.titularTarjeta.reset(
      ''
    );

    this.mesTarjeta.reset(
      ''
    );

    this.anioTarjeta.reset(
      ''
    );

    this.cvvTarjeta.reset(
      ''
    );

    this.celularYape.reset(
      ''
    );

    this.codigoYape.reset(
      ''
    );
  }


  marcarImagenTourFallida(
    id: number
  ): void {

    this.imagenesToursFallidas
      .update(
        ids =>
          new Set([
            ...ids,
            id
          ])
      );
  }


  @HostListener(
    'document:keydown.escape'
  )
  cerrarConEscape(): void {

    if (
      this.fichaEmbarcacionAbierta()
    ) {

      this.cerrarFichaEmbarcacion();

      return;
    }

    if (
      this.modalAbierto()
    ) {

      this.cerrarDetalle();
    }
  }

}
