import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import {
  SalidaProgramada,
  SalidasService
} from '../../services/salidas.service';
import { ToastService } from '../../services/toast.service';


@Component({
  selector: 'app-operador-hoy',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './operador-hoy.html',
  styleUrl: './operador-hoy.css'
})
export class OperadorHoy implements OnInit {

  private readonly salidasService =
    inject(SalidasService);

  private readonly router =
    inject(Router);

  private readonly toast =
    inject(ToastService);

  readonly auth =
    inject(AuthService);


  readonly salidas =
    signal<SalidaProgramada[]>([]);

  readonly cargando =
    signal(false);


  readonly fechaHoy = computed(
    () => this.fechaActualLima()
  );


  readonly salidasHoy = computed(() => {

    const hoy =
      this.fechaActualISO();

    return this.salidas()
      .filter(
        salida =>
          salida.fecha === hoy &&
          salida.estado !== 'CANCELADA'
      )
      .sort(
        (a, b) =>
          a.horaSalida.localeCompare(
            b.horaSalida
          )
      );
  });


  readonly proximaSalida =
    computed(() => {

      const ahora =
        this.minutosActualesLima();

      return (
        this.salidasHoy()
          .filter(
            salida =>
              salida.estado ===
                'PROGRAMADA' &&
              this.horaEnMinutos(
                salida.horaSalida
              ) >= ahora
          )
          .sort(
            (a, b) =>
              a.horaSalida.localeCompare(
                b.horaSalida
              )
          )[0] ?? null
      );
    });


  readonly completadasHoy =
    computed(
      () =>
        this.salidasHoy().filter(
          salida =>
            salida.estado ===
            'COMPLETADA'
        ).length
    );


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


  verTodas(): void {

    this.router.navigate([
      '/app/operador/mis-salidas'
    ]);
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
    salida: SalidaProgramada
  ): string {

    if (
      salida.estado === 'COMPLETADA'
    ) {
      return 'Completada';
    }

    if (
      salida.estado === 'EN_CURSO'
    ) {
      return 'En curso';
    }

    if (
      this.proximaSalida()?.id ===
      salida.id
    ) {
      return 'Próxima';
    }

    return 'Programada';
  }


  claseEstado(
    salida: SalidaProgramada
  ): string {

    if (
      salida.estado === 'COMPLETADA'
    ) {
      return 'estado completada';
    }

    if (
      salida.estado === 'EN_CURSO'
    ) {
      return 'estado curso';
    }

    if (
      this.proximaSalida()?.id ===
      salida.id
    ) {
      return 'estado proxima';
    }

    return 'estado programada';
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
      hora.split(':')
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


  saludo(): string {

    const hora =
      this.horaActualLima();

    if (hora < 12) {
      return 'Buenos días';
    }

    if (hora < 19) {
      return 'Buenas tardes';
    }

    return 'Buenas noches';
  }


  private fechaActualISO():
    string {

    const partes =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'America/Lima',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit'
        }
      ).format(
        new Date()
      );

    return partes;
  }


  private fechaActualLima():
    string {

    return new Intl.DateTimeFormat(
      'es-PE',
      {
        timeZone:
          'America/Lima',

        weekday:
          'long',

        day:
          'numeric',

        month:
          'long',

        year:
          'numeric'
      }
    ).format(
      new Date()
    );
  }


  private horaActualLima():
    number {

    return Number(
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone:
            'America/Lima',

          hour:
            '2-digit',

          hour12:
            false
        }
      ).format(
        new Date()
      )
    );
  }


  private minutosActualesLima():
    number {

    const partes =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone:
            'America/Lima',

          hour:
            '2-digit',

          minute:
            '2-digit',

          hour12:
            false
        }
      )
        .formatToParts(
          new Date()
        );


    const hora =
      Number(
        partes.find(
          item =>
            item.type === 'hour'
        )?.value ?? 0
      );

    const minuto =
      Number(
        partes.find(
          item =>
            item.type === 'minute'
        )?.value ?? 0
      );


    return (
      hora * 60 +
      minuto
    );
  }


  private horaEnMinutos(
    hora: string
  ): number {

    const [
      horas,
      minutos
    ] =
      hora
        .substring(0, 5)
        .split(':')
        .map(Number);

    return (
      horas * 60 +
      minutos
    );
  }


  private obtenerMensajeError(
    error: any,
    respaldo: string
  ): string {

    const respuesta =
      error?.error;

    if (
      typeof respuesta ===
        'string' &&
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