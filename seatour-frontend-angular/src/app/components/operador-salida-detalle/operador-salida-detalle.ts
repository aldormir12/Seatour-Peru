import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  DestroyRef,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  SalidaProgramada,
  SalidasService
} from '../../services/salidas.service';

import {
  Reserva
} from '../../services/reservas.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmacionService } from '../../services/confirmacion.service';
import { ConfirmacionModal } from '../confirmacion-modal/confirmacion-modal';
import { ToastContainer } from '../toast-container/toast-container';
import { of, switchMap } from 'rxjs';
import { OperadorLive } from '../operador-live/operador-live';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';


@Component({
  selector: 'app-operador-salida-detalle',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmacionModal,
    ToastContainer,
    OperadorLive
  ],
  templateUrl: './operador-salida-detalle.html',
  styleUrl: './operador-salida-detalle.css'
})
export class OperadorSalidaDetalle implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private sincronizacion?: ReturnType<typeof setInterval>;
  private verificando = false;
  private revisionSalida = 0;

  private verificarDemo(): void {
    const salida = this.salida();
    if (!salida?.esDemo || this.verificando || this.procesando()) return;
    const revision = this.revisionSalida;
    this.verificando = true;
    this.salidasService.obtenerSalidaPropia(salida.id)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: actualizada => {
          this.verificando = false;
          if (revision === this.revisionSalida && this.salida()?.id === actualizada.id)
            this.salida.set(actualizada);
        },
        error: error => {
          this.verificando = false;
          if (error?.status === 404 || error?.status === 403) this.ocultarDemo();
        }
      });
  }

  private ocultarDemo(): void {
    if (!this.salida()?.esDemo) return;
    // Desmontar el panel libera la transmisión mediante su ciclo de vida existente.
    this.salida.set(null);
    this.reservas.set([]);
    this.mensajeExito.set('');
    this.volver();
  }

  private readonly ahora = signal(Date.now());
  private reloj?: ReturnType<typeof setInterval>;

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly salidasService =
    inject(SalidasService);

  private readonly toast =
    inject(ToastService);

  private readonly confirmacion =
    inject(ConfirmacionService);


  readonly salida =
    signal<SalidaProgramada | null>(null);

  readonly reservas =
    signal<Reserva[]>([]);

  readonly cargando =
    signal(false);

  readonly procesando =
    signal(false);

  readonly mensajeExito = signal('');

  readonly finEstimado = computed(() => {
    const salida = this.salida();
    if (!salida || !salida.duracionMinutos || salida.duracionMinutos <= 0) return null;
    const inicio = salida.estado === 'EN_CURSO' && salida.inicioReal
      ? salida.inicioReal
      : `${salida.fecha}T${salida.horaSalida}`;
    // El backend devuelve LocalDateTime en America/Lima, sin offset.
    const fecha = new Date(Date.parse(`${inicio}-05:00`) + salida.duracionMinutos * 60_000);
    if (!Number.isFinite(fecha.getTime())) return null;
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(fecha);
  });


  readonly totalReservas =
    computed(
      () => this.reservas().length
    );


  readonly totalPasajeros =
    computed(() =>
      this.reservas()
        .reduce(
          (total, reserva) =>
            total +
            this.cantidadPasajerosReserva(
              reserva
            ),
          0
        )
    );


  ngOnInit(): void {
    this.reloj = setInterval(() => this.ahora.set(Date.now()), 1000);
    this.sincronizacion = setInterval(() => this.verificarDemo(), 5_000);

    const id =
      Number(
        this.route.snapshot
          .paramMap
          .get('id')
      );


    if (!id) {

      this.router.navigate([
        '/app/operador/mis-salidas'
      ]);

      return;
    }


    this.cargar(id);
  }

  ngOnDestroy(): void {
    if (this.reloj !== undefined) clearInterval(this.reloj);
    clearInterval(this.sincronizacion);
  }


  cargar(
    id: number
  ): void {

    this.cargando.set(true);


    this.salidasService
      .obtenerSalidaPropia(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: salida => {

          this.salida.set(
            salida
          );


          this.salidasService
            .obtenerReservasSalidaPropia(
              id
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({

              next: reservas => {

                this.reservas.set(
                  reservas
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
                    'No se pudieron cargar las reservas de esta salida.'
                  )
                );
              }

            });
        },

        error: error => {

          this.cargando.set(false);

          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudo cargar la salida.'
            )
          );
        }

      });
  }


  volver(): void {

    this.router.navigate([
      '/app/operador/mis-salidas'
    ]);
  }


  puedeIniciar(): boolean {
    const salida = this.salida();
    return salida?.estado === 'PROGRAMADA' && (salida.esDemo ||
      salida.pasajerosReservados > 0 && this.ahora() >=
      Date.parse(`${salida.fecha}T${salida.horaSalida}-05:00`));
  }


  puedeCompletar(): boolean {

    return (
      this.salida()?.estado ===
      'EN_CURSO'
    );
  }


  async iniciar(): Promise<void> {

    const salida =
      this.salida();

    if (
      !salida ||
      !this.puedeIniciar() ||
      this.procesando()
    ) {
      return;
    }


    const aceptado =
      await this.confirmacion
        .confirmar({

          titulo:
            'Iniciar salida',

          mensaje:
            `¿Deseas iniciar la salida de "${salida.tourNombre}"?`,

          variante:
            'warning',

          textoConfirmar:
            'Iniciar'
        });


    if (!aceptado || this.salida()?.id !== salida.id || !this.puedeIniciar()) {
      return;
    }


    this.cambiarEstado(
      salida,
      'EN_CURSO',
      'Salida iniciada correctamente.'
    );
  }


  async completar(): Promise<void> {

    const salida =
      this.salida();

    if (
      !salida ||
      !this.puedeCompletar() ||
      this.procesando()
    ) {
      return;
    }


    const aceptado =
      await this.confirmacion
        .confirmar({

          titulo:
            'Completar salida',

          mensaje:
            `¿Confirmas que la salida de "${salida.tourNombre}" ha finalizado?`,

          variante:
            'warning',

          textoConfirmar:
            'Completar'
        });


    if (!aceptado || this.salida()?.id !== salida.id || !this.puedeCompletar()) {
      return;
    }


    this.cambiarEstado(
      salida,
      'COMPLETADA',
      'Salida completada correctamente.'
    );
  }


  private cambiarEstado(
    salida: SalidaProgramada,
    estado:
      | 'EN_CURSO'
      | 'COMPLETADA',
    mensajeExito: string
  ): void {

    this.procesando.set(true);
    ++this.revisionSalida;
    this.mensajeExito.set('');


    this.salidasService
      .cambiarEstado(
        salida.id,
        estado
      )
      .pipe(
        switchMap(actualizada =>
          actualizada?.id === salida.id && actualizada.estado === estado
            && (estado === 'EN_CURSO' ? !!actualizada.inicioReal : !!actualizada.finReal)
            ? of(actualizada)
            : this.salidasService.obtenerSalidaPropia(salida.id)
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: actualizada => {

          this.salida.set(
            actualizada
          );

          this.procesando.set(
            false
          );

          this.toast.success(
            mensajeExito
          );
          this.mensajeExito.set(mensajeExito);
        },

        error: error => {

          this.procesando.set(
            false
          );
          if (salida.esDemo && (error?.status === 404 || error?.status === 403)) {
            this.ocultarDemo();
            return;
          }

          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudo cambiar el estado de la salida.'
            )
          );
        }

      });
  }


  cantidadPasajerosReserva(
    reserva: Reserva
  ): number {

    return reserva.totalPasajeros ?? reserva.pasajeros;
  }


  titularReserva(
    reserva: Reserva
  ): string {

    const nombre =
      (reserva as any)
        .clienteNombre ??
      (reserva as any)
        .nombreCliente ??
      '';

    const apellido =
      (reserva as any)
        .clienteApellido ??
      (reserva as any)
        .apellidoCliente ??
      '';


    return (
      `${nombre} ${apellido}`
        .trim() ||
      'Cliente'
    );
  }


  correoReserva(
    reserva: Reserva
  ): string {

    return (
      (reserva as any)
        .clienteCorreo ??
      (reserva as any)
        .correoCliente ??
      ''
    );
  }


  etiquetaEstado(): string {

    switch (
      this.salida()?.estado
    ) {

      case 'PROGRAMADA':
        return 'Programada';

      case 'EN_CURSO':
        return 'En curso';

      case 'COMPLETADA':
        return 'Completada';

      case 'CANCELADA':
        return 'Cancelada';

      default:
        return '';
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
