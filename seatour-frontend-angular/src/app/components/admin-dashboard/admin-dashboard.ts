import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AdicionalVendido,
  DashboardAdminRespuesta,
  DashboardService,
  DemandaTour,
  IngresoTour
} from '../../services/dashboard.service';

import { ToastService } from '../../services/toast.service';


type PeriodoDashboard =
  | 'MES'
  | 'SEMANA'
  | 'PERSONALIZADO';


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {

  private readonly dashboardService =
    inject(DashboardService);

  private readonly toast =
    inject(ToastService);


  readonly cargando =
    signal(false);

  readonly datos =
    signal<DashboardAdminRespuesta | null>(null);


  readonly periodo =
    signal<PeriodoDashboard>('MES');

  readonly desde =
    signal('');

  readonly hasta =
    signal('');


  readonly demandaMaxima = computed(() => {

    const valores =
      this.datos()
        ?.demandaPorTour
        .map(
          item =>
            item.pasajeros
        ) ?? [];

    return Math.max(
      ...valores,
      1
    );
  });


  readonly ingresoMaximo = computed(() => {

    const valores =
      this.datos()
        ?.ingresosPorTour
        .map(
          item =>
            item.ingresosRegistrados
        ) ?? [];

    return Math.max(
      ...valores,
      1
    );
  });


  readonly adicionalMaximo = computed(() => {

    const valores =
      this.datos()
        ?.adicionalesMasVendidos
        .map(
          item =>
            item.cantidad
        ) ?? [];

    return Math.max(
      ...valores,
      1
    );
  });


  readonly totalPasajeros = computed(() => {

    return (
      this.datos()
        ?.demandaPorTour
        .reduce(
          (total, item) =>
            total + item.pasajeros,
          0
        ) ?? 0
    );
  });


  readonly totalReservas = computed(() => {

    return (
      this.datos()
        ?.demandaPorTour
        .reduce(
          (total, item) =>
            total + item.reservas,
          0
        ) ?? 0
    );
  });


  readonly mejorTour = computed<DemandaTour | null>(() => {

    const tours =
      this.datos()
        ?.toursMayorDemanda ?? [];

    return tours.length > 0
      ? tours[0]
      : null;
  });


  readonly mejorIngreso = computed<IngresoTour | null>(() => {

    const tours =
      this.datos()
        ?.ingresosPorTour ?? [];

    if (!tours.length) {
      return null;
    }

    return [...tours]
      .sort(
        (a, b) =>
          b.ingresosRegistrados -
          a.ingresosRegistrados
      )[0];
  });


  readonly adicionalPrincipal = computed<AdicionalVendido | null>(() => {

    const adicionales =
      this.datos()
        ?.adicionalesMasVendidos ?? [];

    return adicionales.length > 0
      ? adicionales[0]
      : null;
  });


  ngOnInit(): void {

    this.aplicarMesActual();
  }


  seleccionarPeriodo(
    periodo: PeriodoDashboard
  ): void {

    this.periodo.set(periodo);


    switch (periodo) {

      case 'MES':
        this.aplicarMesActual();
        break;

      case 'SEMANA':
        this.aplicarSemanaActual();
        break;

      case 'PERSONALIZADO':
        break;
    }
  }


  aplicarFiltroPersonalizado(): void {

    if (
      !this.desde() ||
      !this.hasta()
    ) {
      this.toast.error(
        'Selecciona una fecha inicial y final.'
      );

      return;
    }


    if (
      this.desde() >
      this.hasta()
    ) {
      this.toast.error(
        'La fecha inicial no puede ser posterior a la fecha final.'
      );

      return;
    }


    this.periodo.set(
      'PERSONALIZADO'
    );

    this.cargar();
  }


  cargar(): void {

    this.cargando.set(true);


    this.dashboardService
      .obtener(
        this.desde(),
        this.hasta()
      )
      .subscribe({

        next: respuesta => {

          this.datos.set(
            respuesta
          );

          this.cargando.set(
            false
          );
        },

        error: error => {

          this.cargando.set(
            false
          );

          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudo cargar el dashboard.'
            )
          );
        }

      });
  }


  porcentajeDemanda(
    item: DemandaTour
  ): number {

    return this.porcentaje(
      item.pasajeros,
      this.demandaMaxima()
    );
  }


  porcentajeIngreso(
    item: IngresoTour
  ): number {

    return this.porcentaje(
      item.ingresosRegistrados,
      this.ingresoMaximo()
    );
  }


  porcentajeAdicional(
    item: AdicionalVendido
  ): number {

    return this.porcentaje(
      item.cantidad,
      this.adicionalMaximo()
    );
  }


  formatoMoneda(
    valor:
      | number
      | null
      | undefined
  ): string {

    if (
      valor === null ||
      valor === undefined
    ) {
      return 'Sin datos';
    }


    return new Intl.NumberFormat(
      'es-PE',
      {
        style:
          'currency',

        currency:
          this.datos()?.moneda ||
          'PEN',

        maximumFractionDigits:
          0
      }
    ).format(valor);
  }


  formatoPorcentaje(
    valor:
      | number
      | null
      | undefined
  ): string {

    if (
      valor === null ||
      valor === undefined
    ) {
      return 'Sin datos';
    }


    return `${valor.toFixed(1)}%`;
  }


  formatoMinutos(
    valor:
      | number
      | null
      | undefined
  ): string {

    if (
      valor === null ||
      valor === undefined
    ) {
      return 'Sin datos';
    }


    const absoluto =
      Math.abs(valor);

    const prefijo =
      valor > 0
        ? '+'
        : valor < 0
          ? '-'
          : '';


    return (
      `${prefijo}` +
      `${absoluto.toFixed(1)} min`
    );
  }


  formatoErrorAbsoluto(
    valor:
      | number
      | null
      | undefined
  ): string {

    if (
      valor === null ||
      valor === undefined
    ) {
      return 'Sin datos';
    }


    return `${valor.toFixed(1)} min`;
  }


  private aplicarMesActual(): void {

    const ahora =
      new Date();


    const inicio =
      new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        1
      );


    this.desde.set(
      this.fechaISO(inicio)
    );

    this.hasta.set(
      this.fechaISO(ahora)
    );

    this.cargar();
  }


  private aplicarSemanaActual(): void {

    const ahora =
      new Date();

    const inicio =
      new Date(ahora);


    const dia =
      inicio.getDay();


    const diferencia =
      dia === 0
        ? -6
        : 1 - dia;


    inicio.setDate(
      inicio.getDate() +
      diferencia
    );


    this.desde.set(
      this.fechaISO(inicio)
    );

    this.hasta.set(
      this.fechaISO(ahora)
    );

    this.cargar();
  }


  private fechaISO(
    fecha: Date
  ): string {

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(2, '0');

    const dia =
      String(
        fecha.getDate()
      ).padStart(2, '0');


    return (
      `${anio}-${mes}-${dia}`
    );
  }


  private porcentaje(
    valor: number,
    maximo: number
  ): number {

    if (
      maximo <= 0
    ) {
      return 0;
    }


    return Math.max(
      0,
      Math.min(
        100,
        (valor / maximo) * 100
      )
    );
  }


  private obtenerMensajeError(
    error: any,
    respaldo: string
  ): string {

    const respuesta =
      error?.error;


    if (
      typeof respuesta === 'string' &&
      respuesta.trim()
    ) {
      return respuesta;
    }


    if (
      respuesta?.mensaje
    ) {
      return respuesta.mensaje;
    }


    if (
      respuesta?.detail
    ) {
      return respuesta.detail;
    }


    if (
      respuesta?.message
    ) {
      return respuesta.message;
    }


    return respaldo;
  }

}