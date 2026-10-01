import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  EstadoSalida,
  SalidaProgramada,
  SalidasService
} from '../../services/salidas.service';

import { ToastService } from '../../services/toast.service';


@Component({
  selector: 'app-operador-mis-salidas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './operador-mis-salidas.html',
  styleUrl: './operador-mis-salidas.css'
})
export class OperadorMisSalidas implements OnInit {

  private readonly salidasService =
    inject(SalidasService);

  private readonly toast =
    inject(ToastService);

  private readonly router =
    inject(Router);


  readonly salidas =
    signal<SalidaProgramada[]>([]);

  readonly cargando =
    signal(false);


  readonly busqueda =
    signal('');

  readonly filtroEstado =
    signal<'TODOS' | EstadoSalida>('TODOS');

  readonly filtroFecha =
    signal('');


  readonly total = computed(
    () => this.salidas().length
  );


  readonly programadas = computed(
    () =>
      this.salidas().filter(
        salida =>
          salida.estado === 'PROGRAMADA'
      ).length
  );


  readonly enCurso = computed(
    () =>
      this.salidas().filter(
        salida =>
          salida.estado === 'EN_CURSO'
      ).length
  );


  readonly completadas = computed(
    () =>
      this.salidas().filter(
        salida =>
          salida.estado === 'COMPLETADA'
      ).length
  );


  readonly salidasFiltradas = computed(() => {

    const texto =
      this.normalizar(
        this.busqueda()
      );

    const estado =
      this.filtroEstado();

    const fecha =
      this.filtroFecha();


    return this.salidas()
      .filter(salida => {

        const coincideTexto =
          !texto ||
          this.normalizar(
            salida.tourNombre
          ).includes(texto) ||
          this.normalizar(
            salida.embarcacionNombre
          ).includes(texto);


        const coincideEstado =
          estado === 'TODOS' ||
          salida.estado === estado;


        const coincideFecha =
          !fecha ||
          salida.fecha === fecha;


        return (
          coincideTexto &&
          coincideEstado &&
          coincideFecha
        );
      })
      .sort((a, b) => {

        const fechaA =
          `${a.fecha}T${a.horaSalida}`;

        const fechaB =
          `${b.fecha}T${b.horaSalida}`;

        return fechaA.localeCompare(
          fechaB
        );
      });
  });


  ngOnInit(): void {
    this.cargar();
  }


  cargar(): void {

    this.cargando.set(true);

    this.salidasService
      .listarMisSalidas()
      .subscribe({

        next: salidas => {

          this.salidas.set(
            salidas
          );

          this.cargando.set(false);
        },

        error: error => {

          this.cargando.set(false);

          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudieron cargar tus salidas.'
            )
          );
        }
      });
  }


  verSalida(
    salida: SalidaProgramada
  ): void {

    this.router.navigate([
      '/app/operador/mis-salidas',
      salida.id
    ]);
  }


  cambiarBusqueda(
    valor: string
  ): void {

    this.busqueda.set(valor);
  }


  cambiarEstado(
    valor: string
  ): void {

    this.filtroEstado.set(
      valor as
        | 'TODOS'
        | EstadoSalida
    );
  }


  cambiarFecha(
    valor: string
  ): void {

    this.filtroFecha.set(valor);
  }


  limpiarFiltros(): void {

    this.busqueda.set('');

    this.filtroEstado.set(
      'TODOS'
    );

    this.filtroFecha.set('');
  }


  pasajerosTotales(
    salida: SalidaProgramada
  ): number {

    return (
      (salida.pasajerosReservados ?? 0) +
      (salida.cuposDisponibles ?? 0)
    );
  }


  etiquetaEstado(
    estado: EstadoSalida
  ): string {

    switch (estado) {

      case 'PROGRAMADA':
        return 'Programada';

      case 'EN_CURSO':
        return 'En curso';

      case 'COMPLETADA':
        return 'Completada';

      case 'CANCELADA':
        return 'Cancelada';
    }
  }


  formatearFecha(
    fecha: string
  ): string {

    if (!fecha) {
      return '';
    }


    const [
      anio,
      mes,
      dia
    ] =
      fecha.split('-');


    return (
      `${dia}/${mes}/${anio}`
    );
  }


  formatearHora(
    hora: string
  ): string {

    if (!hora) {
      return '';
    }


    const [
      horas,
      minutos
    ] =
      hora
        .substring(0, 5)
        .split(':')
        .map(Number);


    const sufijo =
      horas >= 12
        ? 'p. m.'
        : 'a. m.';


    const hora12 =
      horas % 12 || 12;


    return (
      `${hora12}:` +
      `${String(minutos).padStart(2, '0')} ` +
      sufijo
    );
  }


  private normalizar(
    valor:
      | string
      | null
      | undefined
  ): string {

    return (
      valor ?? ''
    )
      .trim()
      .toLocaleLowerCase('es');
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


    if (respuesta?.mensaje) {
      return respuesta.mensaje;
    }


    if (respuesta?.detail) {
      return respuesta.detail;
    }


    if (respuesta?.message) {
      return respuesta.message;
    }


    return respaldo;
  }

}