import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  untracked,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { ModoDemoService } from '../../services/modo-demo.service';

import {
  EstadoSalida,
  SalidaProgramada,
  SalidaSolicitud,
  SalidasService,
  EmbarcacionActivaSalida
} from '../../services/salidas.service';

import {
  Tour,
  Tours
} from '../../services/tours';

import { ToastService } from '../../services/toast.service';
import { ConfirmacionService } from '../../services/confirmacion.service';
import { AuthService } from '../../services/auth.service';

import {
  UsuariosService
} from '../../services/usuarios.service';

import type {
  UsuarioAdministrable
} from '../../services/usuarios.service';


interface FormularioSalida {
  motivoReprogramacion: string;
  tourId: number | null;
  embarcacionId: number | null;
  operadorId: number | null;
  fecha: string;
  horaSalida: string;
  cuposDisponibles: number | null;
}


@Component({
  selector: 'app-admin-salidas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-salidas.html',
  styleUrl: './admin-salidas.css'
})
export class AdminSalidas {
  readonly demo = inject(ModoDemoService);
  readonly salidasNormales = computed(() => this.salidas().filter(s => !s.esDemo));
  readonly formularioDemo = computed(() => this.demo.activo() && !this.modoEdicion());

  constructor() {
    effect(() => {
      const activo = this.demo.activo();
      untracked(() => {
        if (!activo) {
          this.salidas.update(lista => lista.filter(s => !s.esDemo));
          if (this.vista() === 'DEMO') this.cambiarVista('ACTIVAS');
        }
        this.cerrarModal();
        this.cargarDatos();
      });
    });
  }


  readonly salidaCancelacion = signal<SalidaProgramada | null>(null);
  readonly cancelando = signal(false);
  readonly errorCancelacion = signal('');
  motivoCancelacion = '';

  readonly motivosCancelacion = [
    { valor: 'CONDICIONES_MARITIMAS', nombre: 'Condiciones marítimas' },
    { valor: 'AUTORIDAD_MARITIMA', nombre: 'Autoridad marítima' },
    { valor: 'FALLA_TECNICA', nombre: 'Falla técnica' },
    { valor: 'SEGURIDAD_OPERATIVA', nombre: 'Seguridad operativa' },
    { valor: 'FUERZA_MAYOR', nombre: 'Fuerza mayor' }
  ];


  motivoCancelacionValido(): boolean {
    return this.motivosCancelacion.some(
      item => item.valor === this.motivoCancelacion
    );
  }


  cerrarCancelacion(): void {
    if (!this.cancelando()) {
      this.salidaCancelacion.set(null);
    }
  }


  confirmarCancelacion(): void {
    const salida = this.salidaCancelacion();

    if (!salida || this.cancelando()) {
      return;
    }

    if (!this.motivoCancelacionValido()) {
      this.errorCancelacion.set(
        'Selecciona un motivo de cancelación válido.'
      );
      return;
    }

    this.cancelando.set(true);
    this.errorCancelacion.set('');

    this.salidasService
      .cambiarEstado(
        salida.id,
        'CANCELADA',
        this.motivoCancelacion
      )
      .subscribe({
        next: actualizada => {
          this.salidas.update(lista =>
            lista.map(item =>
              item.id === actualizada.id
                ? actualizada
                : item
            )
          );

          this.cancelando.set(false);
          this.cerrarCancelacion();

          this.toast.success(
            'Salida cancelada correctamente.'
          );
        },

        error: error => {
          this.cancelando.set(false);

          this.errorCancelacion.set(
            this.obtenerMensajeError(
              error,
              'No se pudo cancelar la salida.'
            )
          );
        }
      });
  }


  readonly salidaCambioEmbarcacion =
    signal<SalidaProgramada | null>(null);

  nuevaEmbarcacionId: number | null = null;
  motivoCambioEmbarcacion = '';
  readonly errorCambioEmbarcacion = signal('');

  readonly motivosCambioEmbarcacion = [
    { valor: 'FALLA_TECNICA', nombre: 'Falla técnica' },
    { valor: 'SEGURIDAD_OPERATIVA', nombre: 'Seguridad operativa' }
  ];


  abrirCambioEmbarcacion(
    salida: SalidaProgramada
  ): void {

    if (!this.puedeEditar(salida)) {
      return;
    }

    this.salidaCambioEmbarcacion.set(salida);
    this.nuevaEmbarcacionId = null;
    this.motivoCambioEmbarcacion = '';
    this.errorCambioEmbarcacion.set('');
  }


  cerrarCambioEmbarcacion(): void {
    if (!this.guardando()) {
      this.salidaCambioEmbarcacion.set(null);
    }
  }


  cuposCambioEmbarcacion():
    number | null {

    const embarcacion =
      this.embarcaciones().find(
        item =>
          item.id === this.nuevaEmbarcacionId
      );

    return embarcacion
      ? embarcacion.capacidad -
          (
            this.salidaCambioEmbarcacion()
              ?.pasajerosReservados ?? 0
          )
      : null;
  }


  guardarCambioEmbarcacion(): void {
    const salida =
      this.salidaCambioEmbarcacion();

    if (!salida || this.guardando()) {
      return;
    }

    this.errorCambioEmbarcacion.set('');

    if (
      !this.nuevaEmbarcacionId ||
      this.nuevaEmbarcacionId ===
        salida.embarcacionId
    ) {
      this.errorCambioEmbarcacion.set(
        'Selecciona una embarcación diferente.'
      );
      return;
    }

    if (
      !this.motivosCambioEmbarcacion.some(
        item =>
          item.valor ===
          this.motivoCambioEmbarcacion
      )
    ) {
      this.errorCambioEmbarcacion.set(
        'Selecciona el motivo del cambio.'
      );
      return;
    }

    const cupos =
      this.cuposCambioEmbarcacion();

    if (
      cupos === null ||
      cupos < 0
    ) {
      this.errorCambioEmbarcacion.set(
        'La embarcación no tiene capacidad para los pasajeros reservados.'
      );
      return;
    }

    this.guardando.set(true);

    this.salidasService
      .cambiarEmbarcacion(
        salida.id,
        this.nuevaEmbarcacionId,
        this.motivoCambioEmbarcacion
      )
      .subscribe({
        next: actualizada => {
          this.salidas.update(lista =>
            lista.map(item =>
              item.id === actualizada.id
                ? actualizada
                : item
            )
          );

          this.guardando.set(false);
          this.cerrarCambioEmbarcacion();

          this.toast.success(
            'Embarcación cambiada. Las reservas se mantienen.'
          );
        },

        error: error => {
          this.guardando.set(false);

          this.errorCambioEmbarcacion.set(
            this.obtenerMensajeError(
              error,
              'No se pudo cambiar la embarcación.'
            )
          );
        }
      });
  }


  readonly motivosReprogramacion = [
    { valor: 'CONDICIONES_MARITIMAS', nombre: 'Condiciones marítimas' },
    { valor: 'AUTORIDAD_MARITIMA', nombre: 'Autoridad marítima' },
    { valor: 'FALLA_TECNICA', nombre: 'Falla técnica' },
    { valor: 'SEGURIDAD_OPERATIVA', nombre: 'Seguridad operativa' },
    { valor: 'FUERZA_MAYOR', nombre: 'Fuerza mayor' }
  ];


  private readonly salidasService =
    inject(SalidasService);

  private readonly toursService =
    inject(Tours);

  private readonly usuariosService =
    inject(UsuariosService);

  private readonly toast =
    inject(ToastService);

  private readonly confirmacion =
    inject(ConfirmacionService);

  private readonly auth =
    inject(AuthService);


  readonly salidas =
    signal<SalidaProgramada[]>([]);

  readonly tours =
    signal<Tour[]>([]);

  readonly embarcaciones =
    signal<EmbarcacionActivaSalida[]>([]);

  readonly operadores =
    signal<UsuarioAdministrable[]>([]);


  readonly cargando =
    signal(false);

  readonly guardando =
    signal(false);


  readonly modalAbierto =
    signal(false);

  readonly modoEdicion =
    signal(false);


  readonly salidaSeleccionada =
    signal<SalidaProgramada | null>(null);


  readonly errorFormulario =
    signal('');


  readonly busqueda =
    signal('');

  readonly vista =
    signal<'ACTIVAS' | 'HISTORIAL' | 'DEMO'>(
      'ACTIVAS'
    );


  cambiarVista(
    vista: 'ACTIVAS' | 'HISTORIAL' | 'DEMO'
  ): void {

    if (this.vista() === vista) {
      return;
    }

    this.vista.set(vista);

    this.filtroEstado.set('TODOS');
    if (vista === 'ACTIVAS') this.filtroFecha.set(this.fechaMinima);
  }

  readonly filtroFecha = signal(this.fechaMinima);

  get fechaManana(): string {
    const fecha = new Date(`${this.fechaMinima}T00:00:00Z`);
    fecha.setUTCDate(fecha.getUTCDate() + 1);
    return fecha.toISOString().slice(0, 10);
  }

  seleccionarFecha(atajo: 'HOY' | 'MANANA' | 'TODAS'): void {
    this.filtroFecha.set(atajo === 'HOY' ? this.fechaMinima : atajo === 'MANANA' ? this.fechaManana : '');
  }


  readonly filtroEstado =
    signal<'TODOS' | EstadoSalida>(
      'TODOS'
    );


  readonly filtroTour =
    signal<number | null>(null);


  readonly filtroEmbarcacion =
    signal<number | null>(null);


  formulario: FormularioSalida =
    this.formularioVacio();


  readonly total = computed(
    () => this.salidasNormales().length
  );


  readonly programadas = computed(
    () =>
      this.salidasNormales().filter(
        salida =>
          salida.estado ===
          'PROGRAMADA'
      ).length
  );


  readonly enCurso = computed(
    () =>
      this.salidasNormales().filter(
        salida =>
          salida.estado ===
          'EN_CURSO'
      ).length
  );


  readonly completadas = computed(
    () =>
      this.salidasNormales().filter(
        salida =>
          salida.estado ===
          'COMPLETADA'
      ).length
  );


  readonly canceladas = computed(
    () =>
      this.salidasNormales().filter(
        salida =>
          salida.estado ===
          'CANCELADA'
      ).length
  );


  embarcacionSeleccionada():
    EmbarcacionActivaSalida | null {

    const id =
      this.formulario.embarcacionId;

    if (!id) {
      return null;
    }

    return (
      this.embarcaciones().find(
        embarcacion =>
          embarcacion.id === id
      ) ?? null
    );
  }


  readonly tourSeleccionado =
    computed(() => {

      const id =
        this.formulario.tourId;

      if (!id) {
        return null;
      }

      return (
        this.tours().find(
          tour =>
            tour.id === id
        ) ?? null
      );
    });


  readonly salidasFiltradas =
    computed(() => {

      const vista =
        this.vista();

      const texto =
        this.normalizar(
          this.busqueda()
        );

      const estado =
        this.filtroEstado();

      const tourId =
        this.filtroTour();

      const embarcacionId =
        this.filtroEmbarcacion();

      const fecha = this.filtroFecha();


      return this.salidas()
        .filter(salida => vista === 'DEMO' ? this.demo.activo() && salida.esDemo : !salida.esDemo)
        .filter(salida => {

          const coincideVista =
            vista === 'DEMO' ? true : vista === 'ACTIVAS'
              ? (
                  salida.estado ===
                    'PROGRAMADA' ||
                  salida.estado ===
                    'EN_CURSO'
                )
              : (
                  salida.estado ===
                    'COMPLETADA' ||
                  salida.estado ===
                    'CANCELADA'
                );


          const coincideTexto =
            !texto ||
            this.normalizar(
              salida.tourNombre
            ).includes(texto) ||
            this.normalizar(
              salida.embarcacionNombre
            ).includes(texto) ||
            (vista === 'HISTORIAL' && this.normalizar(
              `${salida.operadorNombre ?? ''} ${salida.operadorApellido ?? ''}`
            ).includes(texto));


          const coincideEstado =
            vista === 'ACTIVAS' || estado === 'TODOS' ||
            salida.estado === estado;

          const coincideFecha = vista !== 'ACTIVAS' || !fecha || salida.fecha === fecha;


          const coincideTour =
            !tourId ||
            salida.tourId === tourId;


          const coincideEmbarcacion =
            !embarcacionId ||
            salida.embarcacionId ===
              embarcacionId;


          return (
            coincideVista &&
            coincideTexto &&
            coincideEstado &&
            coincideTour &&
            coincideFecha &&
            coincideEmbarcacion
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




  private cargaActual = 0;

  cargarDatos(): void {
    const carga = ++this.cargaActual;
    this.cargando.set(true);

    const demoAlCargar = this.demo.activo();
    forkJoin({
      demo: demoAlCargar ? this.salidasService.listarDemo() : of([] as SalidaProgramada[]),
      salidas:
        this.salidasService.listar(),

      tours:
        this.toursService
          .listarActivos(),

      embarcaciones:
        this.salidasService
          .listarEmbarcacionesActivas(),

      operadores:
        this.usuariosService.listar()
    }).subscribe({
      next: resultado => {
        if (carga !== this.cargaActual) return;

        this.salidas.set(
          [...resultado.salidas, ...(this.demo.activo() && demoAlCargar ? resultado.demo : [])]
        );

        this.tours.set(
          resultado.tours
        );

        this.embarcaciones.set(
          resultado.embarcaciones
        );

        this.operadores.set(
          resultado.operadores.filter(
            usuario =>
              usuario.rol ===
                'OPERADOR' &&
              usuario.activo
          )
        );

        this.cargando.set(false);
      },

      error: error => {
        if (carga !== this.cargaActual) return;

        this.cargando.set(false);

        this.toast.error(
          this.obtenerMensajeError(
            error,
            'No se pudieron cargar las salidas.'
          )
        );
      }
    });
  }


  abrirCrear(): void {
    this.modoEdicion.set(false);

    this.salidaSeleccionada.set(
      null
    );

    this.formulario =
      this.formularioVacio();

    this.errorFormulario.set('');

    this.modalAbierto.set(true);
  }


  abrirEditar(
    salida: SalidaProgramada
  ): void {

    if (
      salida.pasajerosReservados > 0 &&
      salida.cambioOperativoConsumido
    ) {

      this.toast.warning(
        'La salida ya consumió su único cambio operativo.'
      );

      return;
    }


    if (
      salida.estado !==
      'PROGRAMADA'
    ) {

      this.toast.warning(
        'Solo las salidas programadas pueden editarse.'
      );

      return;
    }


    this.modoEdicion.set(true);

    this.salidaSeleccionada.set(
      salida
    );


    this.formulario = {
      motivoReprogramacion: '',

      tourId:
        salida.tourId,

      embarcacionId:
        salida.embarcacionId,

      operadorId:
        salida.operadorId ?? null,

      fecha:
        salida.fecha,

      horaSalida:
        this.normalizarHora(
          salida.horaSalida
        ),

      cuposDisponibles:
        salida.cuposDisponibles
    };


    this.errorFormulario.set('');

    this.modalAbierto.set(true);
  }


  cerrarModal(): void {
    if (this.guardando()) {
      return;
    }

    this.modalAbierto.set(false);

    this.errorFormulario.set('');
  }


  guardar(): void {
    this.errorFormulario.set('');

    const error =
      this.validarFormulario();

    if (error) {
      this.errorFormulario.set(
        error
      );

      return;
    }


    const datos:
      SalidaSolicitud = {
      esDemo: this.formularioDemo(),

      motivoReprogramacion:
        this.salidaSeleccionada()
          ?.tieneReservas
          ? this.formulario
              .motivoReprogramacion
          : undefined,

      fecha:
        this.formulario.fecha,

      horaSalida:
        this.formulario.horaSalida,

      tourId:
        Number(
          this.formulario.tourId
        ),

      embarcacionId:
        Number(
          this.modoEdicion()
            ? this
                .salidaSeleccionada()
                ?.embarcacionId
            : this.formulario
                .embarcacionId
        ),

      operadorId:
        Number(
          this.formulario
            .operadorId
        )
    };


    this.guardando.set(true);

    const seleccionada =
      this.salidaSeleccionada();


    if (
      this.modoEdicion() &&
      seleccionada
    ) {

      this.salidasService
        .actualizar(
          seleccionada.id,
          datos
        )
        .subscribe({
          next: actualizada => {

            this.salidas.update(
              lista =>
                lista.map(
                  item =>
                    item.id ===
                    actualizada.id
                      ? actualizada
                      : item
                )
            );

            this.guardando.set(
              false
            );

            this.cerrarModal();

            this.toast.success(
              'Salida actualizada correctamente.'
            );
          },

          error:
            errorActualizacion => {

              this.guardando.set(
                false
              );

              this.errorFormulario.set(
                this.obtenerMensajeError(
                  errorActualizacion,
                  'No se pudo actualizar la salida.'
                )
              );
            }
        });

      return;
    }


    this.salidasService
      .crear(datos)
      .subscribe({
        next: creada => {

          this.salidas.update(
            lista => [
              ...lista,
              creada
            ]
          );

          this.guardando.set(
            false
          );

          this.cerrarModal();
          this.cargarDatos();
          if (creada.esDemo && this.demo.activo()) this.cambiarVista('DEMO');

          this.toast.success(
            'Salida programada correctamente.'
          );
        },

        error: errorCreacion => {

          this.guardando.set(
            false
          );

          this.errorFormulario.set(
            this.obtenerMensajeError(
              errorCreacion,
              'No se pudo crear la salida.'
            )
          );
        }
      });
  }


  async iniciar(
    salida: SalidaProgramada
  ): Promise<void> {

    if (
      salida.estado !==
      'PROGRAMADA'
    ) {
      return;
    }

    const aceptado =
      await this.confirmacion
        .confirmar({
          titulo:
            'Iniciar salida',

          mensaje:
            `¿Deseas marcar la salida de "${salida.tourNombre}" como en curso?`,

          variante:
            'warning',

          textoConfirmar:
            'Iniciar'
        });

    if (!aceptado) {
      return;
    }

    this.cambiarEstado(
      salida,
      'EN_CURSO',
      'Salida iniciada correctamente.'
    );
  }


  async completar(
    salida: SalidaProgramada
  ): Promise<void> {

    if (
      salida.estado !==
      'EN_CURSO'
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

    if (!aceptado) {
      return;
    }

    this.cambiarEstado(
      salida,
      'COMPLETADA',
      'Salida completada correctamente.'
    );
  }


  async cancelar(
    salida: SalidaProgramada
  ): Promise<void> {

    if (
      salida.estado !==
      'PROGRAMADA'
    ) {
      return;
    }

    if (
      salida.pasajerosReservados > 0
    ) {
      this.motivoCancelacion = '';

      this.errorCancelacion.set(
        ''
      );

      this.salidaCancelacion.set(
        salida
      );

      return;
    }

    const aceptado =
      await this.confirmacion
        .confirmar({
          titulo:
            'Cancelar salida',

          mensaje:
            `¿Deseas cancelar la salida de "${salida.tourNombre}"? ` +
            'Las reservas activas asociadas también serán canceladas.',

          variante:
            'danger',

          textoConfirmar:
            'Cancelar salida'
        });

    if (!aceptado) {
      return;
    }

    this.cambiarEstado(
      salida,
      'CANCELADA',
      'Salida cancelada correctamente.'
    );
  }


  async eliminar(
    salida: SalidaProgramada
  ): Promise<void> {

    const aceptado =
      await this.confirmacion
        .confirmar({
          titulo:
            'Eliminar salida',

          mensaje:
            `¿Deseas eliminar definitivamente la salida de ` +
            `"${salida.tourNombre}" del ${this.formatearFecha(salida.fecha)}?`,

          variante:
            'danger',

          textoConfirmar:
            'Eliminar'
        });

    if (!aceptado) {
      return;
    }

    this.salidasService
      .eliminar(
        salida.id
      )
      .subscribe({
        next: () => {

          this.salidas.update(
            lista =>
              lista.filter(
                item =>
                  item.id !==
                  salida.id
              )
          );

          this.toast.success(
            'Salida eliminada correctamente.'
          );
        },

        error: error => {

          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudo eliminar la salida.'
            )
          );
        }
      });
  }


  puedeEditar(
    salida: SalidaProgramada
  ): boolean {

    return (
      salida.estado ===
        'PROGRAMADA' &&
      !(
        salida.pasajerosReservados >
          0 &&
        salida
          .cambioOperativoConsumido
      )
    );
  }


  puedeIniciar(
    salida: SalidaProgramada
  ): boolean {

    return (
      salida.estado ===
      'PROGRAMADA'
    );
  }


  puedeCancelar(
    salida: SalidaProgramada
  ): boolean {

    return (
      salida.estado ===
      'PROGRAMADA'
    );
  }


  puedeCompletar(
    salida: SalidaProgramada
  ): boolean {

    return (
      this.auth.tieneRol(
        'OPERADOR'
      ) &&
      salida.estado ===
        'EN_CURSO'
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

    return `${dia}/${mes}/${anio}`;
  }


  formatearHora(
    hora: string
  ): string {

    if (!hora) {
      return '';
    }

    return hora.substring(
      0,
      5
    );
  }


  cambiarBusqueda(
    valor: string
  ): void {

    this.busqueda.set(
      valor
    );
  }


  cambiarFiltroEstado(
    valor:
      | 'TODOS'
      | EstadoSalida
  ): void {

    this.filtroEstado.set(
      valor
    );
  }


  cambiarFiltroTour(
    valor: string
  ): void {

    this.filtroTour.set(
      valor
        ? Number(valor)
        : null
    );
  }


  cambiarFiltroEmbarcacion(
    valor: string
  ): void {

    this.filtroEmbarcacion.set(
      valor
        ? Number(valor)
        : null
    );
  }


  actualizarCuposPorEmbarcacion():
    void {

    const embarcacion =
      this.embarcacionSeleccionada();

    if (!this.modoEdicion()) {

      this.formulario
        .cuposDisponibles =
          embarcacion
            ?.capacidad ??
          null;

      return;
    }

    const seleccionada =
      this.salidaSeleccionada();

    this.formulario
      .cuposDisponibles =
        !embarcacion
          ? null
          : embarcacion.id ===
              seleccionada
                ?.embarcacionId
            ? seleccionada
                .cuposDisponibles
            : embarcacion.capacidad -
                (
                  seleccionada
                    ?.pasajerosReservados ??
                  0
                );
  }


  private cambiarEstado(
    salida: SalidaProgramada,
    estado: EstadoSalida,
    mensajeExito: string
  ): void {

    this.salidasService
      .cambiarEstado(
        salida.id,
        estado
      )
      .subscribe({
        next: actualizada => {

          this.salidas.update(
            lista =>
              lista.map(
                item =>
                  item.id ===
                  actualizada.id
                    ? actualizada
                    : item
              )
          );

          this.toast.success(
            mensajeExito
          );
        },

        error: error => {

          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudo cambiar el estado de la salida.'
            )
          );
        }
      });
  }


  get fechaMinima(): string {

    const partes =
      new Intl.DateTimeFormat(
        'en-US',
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
      )
        .formatToParts(
          new Date()
        );

    const valor =
      (tipo: string) =>
        partes.find(
          parte =>
            parte.type ===
            tipo
        )!.value;

    return (
      `${valor('year')}-` +
      `${valor('month')}-` +
      `${valor('day')}`
    );
  }


  get fechaMaxima(): string {

    const fecha =
      new Date(
        `${this.fechaMinima}T00:00:00Z`
      );

    fecha.setUTCDate(
      fecha.getUTCDate() +
        45
    );

    return fecha
      .toISOString()
      .slice(
        0,
        10
      );
  }


  private validarFormulario():
    string | null {

    if (
      !this.formulario.tourId
    ) {
      return 'Selecciona un tour.';
    }


    if (
      !this.formulario
        .embarcacionId
    ) {
      return 'Selecciona una embarcación.';
    }


    if (
      !this.formulario.operadorId
    ) {
      return 'Selecciona un operador responsable.';
    }


    if (
      !this.formulario.fecha
    ) {
      return 'Selecciona la fecha de la salida.';
    }


    if (!this.formularioDemo() && (
      this.formulario.fecha < this.fechaMinima ||
      this.formulario.fecha > this.fechaMaxima
    )) {
      return (
        `La fecha debe estar entre ` +
        `${this.fechaMinima} y ` +
        `${this.fechaMaxima} ` +
        `(America/Lima).`
      );
    }


    if (
      !this.formulario
        .horaSalida
    ) {
      return 'Selecciona la hora de salida.';
    }


    const hora =
      this.formulario
        .horaSalida.length === 5
        ? `${this.formulario.horaSalida}:00`
        : this.formulario
            .horaSalida;


    if (!this.formularioDemo() && (
      hora < '06:00:00' || hora > '19:00:00'
    )) {
      return (
        'La hora de inicio debe estar entre ' +
        '06:00 y 19:00 (America/Lima).'
      );
    }


    const seleccionada =
      this.salidaSeleccionada();


    if (
      this.modoEdicion() &&
      seleccionada?.tieneReservas
    ) {
      const cambiaOperador =
        this.formulario.operadorId !== (seleccionada.operadorId ?? null);
      const soloCambiaOperador = cambiaOperador &&
        this.formulario.embarcacionId === seleccionada.embarcacionId &&
        Date.parse(`${this.formulario.fecha}T${hora}-05:00`) ===
          Date.parse(`${seleccionada.fecha}T${seleccionada.horaSalida}-05:00`);

      if (
        !soloCambiaOperador && !this.motivosReprogramacion
          .some(
            motivo =>
              motivo.valor ===
              this.formulario
                .motivoReprogramacion
          )
      ) {

        return (
          'Selecciona el motivo ' +
          'de la reprogramación.'
        );
      }


      const nueva =
        Date.parse(
          `${this.formulario.fecha}T${hora}-05:00`
        );

      const anterior =
        Date.parse(
          `${seleccionada.fecha}T${seleccionada.horaSalida}-05:00`
        );

      const original =
        Date.parse(
          `${seleccionada.fechaOriginal ?? seleccionada.fecha}` +
          `T${seleccionada.horaOriginal ?? seleccionada.horaSalida}-05:00`
        );


      const cambiaEmbarcacion =
        this.formulario
          .embarcacionId !==
        seleccionada.embarcacionId;


      if (
        nueva < anterior ||
        (
          nueva === anterior &&
          !cambiaEmbarcacion &&
          !cambiaOperador
        )
      ) {

        return (
          'Con reservas, la salida solo puede moverse hacia adelante; ' +
          'puedes cambiar únicamente la embarcación o el operador conservando el horario.'
        );
      }


      if (
        nueva !== anterior &&
        nueva >
          original +
            72 *
              60 *
              60 *
              1000
      ) {

        return (
          'La reprogramación no puede superar ' +
          '72 horas desde el horario original ' +
          '(America/Lima).'
        );
      }
    }


    const cupos =
      Number(
        this.formulario
          .cuposDisponibles
      );


    if (
      !Number.isInteger(
        cupos
      )
    ) {

      return (
        'Los cupos deben ser un número entero.'
      );
    }


    if (
      cupos < 0
    ) {

      return (
        'La nueva embarcación no tiene capacidad ' +
        'para los pasajeros ya reservados.'
      );
    }


    const embarcacion =
      this.embarcacionSeleccionada();


    if (
      embarcacion &&
      cupos >
        embarcacion.capacidad
    ) {

      return (
        `La embarcación admite como máximo ` +
        `${embarcacion.capacidad} pasajeros.`
      );
    }


    return null;
  }


  private formularioVacio():
    FormularioSalida {

    return {
      motivoReprogramacion: '',
      tourId: null,
      embarcacionId: null,
      operadorId: null,
      fecha: '',
      horaSalida: '',
      cuposDisponibles: null
    };
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
      .toLocaleLowerCase(
        'es'
      );
  }


  private normalizarHora(
    hora: string
  ): string {

    return hora
      ? hora.substring(
          0,
          5
        )
      : '';
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


    if (
      respuesta?.error
    ) {
      return respuesta.error;
    }


    return respaldo;
  }
}
