import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  afterEveryRender,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  CurrencyPipe,
  DatePipe
} from '@angular/common';

import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

import {
  Reserva,
  ReservasService,
  errorReserva
} from '../../services/reservas.service';

import { ClienteShell } from '../../layouts/cliente-shell/cliente-shell';

@Component({
  selector: 'app-reservas-lista',
  standalone: true,

  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink
  ],

  templateUrl: './reservas-lista.html'
})
export class ReservasListaComponent {
  readonly clienteShell = inject(ClienteShell, { optional: true });

  private readonly api = inject(ReservasService);
  readonly auth = inject(AuthService);

  readonly reservas = signal<Reserva[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly filtro = signal<
    '' | 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA'
  >('');

  /*
   * detalleMontado:
   * controla si el offcanvas existe en el DOM.
   *
   * detalleAbierto:
   * controla su estado visual para poder animar
   * tanto entrada como salida.
   */
  readonly detalleMontado = signal(false);
  readonly detalleAbierto = signal(false);

  readonly cargandoDetalle = signal(false);
  readonly cancelando = signal(false);

  readonly reservaSeleccionada =
    signal<Reserva | null>(null);

  readonly confirmarCancelacion =
    signal(false);

  readonly mensajeDetalle =
    signal('');

  readonly errorDetalle =
    signal('');

  @ViewChild('carrusel')
  private carrusel?: ElementRef<HTMLElement>;

  private reiniciarCarrusel = false;

  private temporizadorCierre:
    ReturnType<typeof setTimeout> | null = null;

  readonly visibles = computed(() => {
    const estado = this.filtro();

    if (!estado) {
      return this.reservas();
    }

    return this.reservas()
      .filter(
        reserva =>
          reserva.estado === estado
      );
  });

  readonly hayAnterior = signal(false);
  readonly haySiguiente = signal(false);

  constructor() {
    afterEveryRender(() => {
      if (this.reiniciarCarrusel) {
        this.carrusel?.nativeElement.scrollTo({
          left: 0,
          behavior: 'smooth'
        });

        this.reiniciarCarrusel = false;
      }

      this.actualizarEstadoCarrusel();
    });

    this.cargar();
  }

  // =========================================================
  // RESERVAS
  // =========================================================

  cargar(): void {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    this.api
      .listar(false)
      .subscribe({
        next: reservas => {
          this.reservas.set(reservas);
          this.cargando.set(false);
        },

        error: error => {
          this.reservas.set([]);

          this.error.set(
            errorReserva(error)
          );

          this.cargando.set(false);
        }
      });
  }

  cambiarFiltro(
    estado:
      '' |
      'PENDIENTE' |
      'CONFIRMADA' |
      'CANCELADA'
  ): void {
    this.filtro.set(estado);
    this.reiniciarCarrusel = true;
  }

  // =========================================================
  // CARRUSEL
  // =========================================================

  moverCarrusel(
    direccion: -1 | 1
  ): void {
    const elemento =
      this.carrusel?.nativeElement;

    if (!elemento) {
      return;
    }

    const tarjeta =
      elemento.querySelector('article');

    if (!tarjeta) {
      return;
    }

    const desplazamiento =
      tarjeta.getBoundingClientRect().width +
      (parseFloat(
        getComputedStyle(elemento).columnGap
      ) || 0);

    elemento.scrollBy({
      left:
        desplazamiento *
        direccion,

      behavior: 'smooth'
    });

    window.setTimeout(
      () =>
        this.actualizarEstadoCarrusel(),
      350
    );
  }

  actualizarEstadoCarrusel(): void {
    const elemento =
      this.carrusel?.nativeElement;

    if (!elemento) {
      this.hayAnterior.set(false);
      this.haySiguiente.set(false);

      return;
    }

    const margen = 8;

    this.hayAnterior.set(
      elemento.scrollLeft > margen
    );

    this.haySiguiente.set(
      elemento.scrollLeft +
      elemento.clientWidth <
      elemento.scrollWidth -
      margen
    );
  }

  // =========================================================
  // DETALLE
  // =========================================================

  abrirDetalle(
    reserva: Reserva
  ): void {
    if (this.temporizadorCierre) {
      clearTimeout(
        this.temporizadorCierre
      );

      this.temporizadorCierre = null;
    }

    this.reservaSeleccionada.set(
      reserva
    );

    this.confirmarCancelacion.set(
      false
    );

    this.errorDetalle.set('');
    this.mensajeDetalle.set('');

    /*
     * Primero montamos el offcanvas completamente cerrado.
     */
    this.detalleAbierto.set(false);
    this.detalleMontado.set(true);

    /*
     * Esperamos a que Angular lo pinte en el DOM.
     * Después activamos el estado abierto para que
     * CSS pueda interpolar la transición.
     */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.detalleAbierto.set(true);
      });
    });

    this.cargarDetalle(
      reserva.id
    );
  }

  private cargarDetalle(
    id: number
  ): void {
    if (this.cargandoDetalle()) {
      return;
    }

    this.cargandoDetalle.set(true);

    this.api
      .consultar(id)
      .subscribe({
        next: reserva => {
          this.reservaSeleccionada.set(
            reserva
          );

          this.actualizarReservaLocal(
            reserva
          );

          this.cargandoDetalle.set(
            false
          );
        },

        error: error => {
          this.errorDetalle.set(
            errorReserva(error)
          );

          this.cargandoDetalle.set(
            false
          );
        }
      });
  }

  cerrarDetalle(): void {
    if (
      this.cancelando() ||
      !this.detalleMontado()
    ) {
      return;
    }

    /*
     * Primero iniciamos la animación de salida.
     */
    this.detalleAbierto.set(false);

    this.confirmarCancelacion.set(
      false
    );

    this.errorDetalle.set('');
    this.mensajeDetalle.set('');

    /*
     * El panel sigue montado mientras termina
     * la transición. Después se elimina del DOM.
     */
    this.temporizadorCierre =
      setTimeout(() => {
        this.detalleMontado.set(false);

        this.reservaSeleccionada.set(
          null
        );

        this.temporizadorCierre = null;
      }, 300);
  }

  // =========================================================
  // CANCELACIÓN
  // =========================================================

  solicitarCancelacion(): void {
    const reserva =
      this.reservaSeleccionada();

    if (
      !reserva ||
      !reserva.puedeCancelar
    ) {
      return;
    }

    this.confirmarCancelacion.set(
      true
    );

    this.errorDetalle.set('');
    this.mensajeDetalle.set('');
  }

  cancelarCancelacion(): void {
    if (this.cancelando()) {
      return;
    }

    this.confirmarCancelacion.set(
      false
    );
  }

  cancelarReserva(): void {
    const reserva =
      this.reservaSeleccionada();

    if (
      !reserva ||
      !reserva.puedeCancelar ||
      this.cancelando()
    ) {
      return;
    }

    this.cancelando.set(true);

    this.errorDetalle.set('');
    this.mensajeDetalle.set('');

    this.api
      .cancelar(reserva.id)
      .subscribe({
        next: actualizada => {
          this.reservaSeleccionada.set(
            actualizada
          );

          this.actualizarReservaLocal(
            actualizada
          );

          this.confirmarCancelacion.set(
            false
          );

          this.cancelando.set(false);

          this.mensajeDetalle.set(
            'Reserva cancelada. Los cupos fueron liberados correctamente.'
          );
        },

        error: error => {
          this.errorDetalle.set(
            errorReserva(error)
          );

          this.cancelando.set(false);
        }
      });
  }

  private actualizarReservaLocal(
    reserva: Reserva
  ): void {
    this.reservas.update(
      actuales =>
        actuales.map(
          actual =>
            actual.id === reserva.id
              ? reserva
              : actual
        )
    );
  }

  // =========================================================
  // UTILIDADES VISUALES
  // =========================================================

  etiquetaEstado(
    estado: Reserva['estado']
  ): string {
    switch (estado) {
      case 'CONFIRMADA':
        return 'Confirmada';

      case 'PENDIENTE':
        return 'Pendiente';

      case 'CANCELADA':
        return 'Cancelada';

      default:
        return estado;
    }
  }

  @HostListener(
    'document:keydown.escape'
  )
  cerrarConEscape(): void {
    if (
      this.confirmarCancelacion()
    ) {
      this.cancelarCancelacion();
      return;
    }

    if (
      this.detalleAbierto()
    ) {
      this.cerrarDetalle();
    }
  }
}