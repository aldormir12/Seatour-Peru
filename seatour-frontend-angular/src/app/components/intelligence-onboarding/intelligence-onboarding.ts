import { CommonModule } from '@angular/common';

import {
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { forkJoin } from 'rxjs';

import { AuthService } from '../../services/auth.service';

import {
  ActualizarPreferenciasCliente,
  CategoriaPreferencia,
  PreferenciasService
} from '../../services/preferencias.service';

import { ToastService } from '../../services/toast.service';


import { horarios, actividades, grupos, opcionesPrioridad, opcionesRestriccion } from '../../services/preferencias-opciones';


@Component({
  selector: 'app-intelligence-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './intelligence-onboarding.html',
  styleUrl: './intelligence-onboarding.css'
})
export class IntelligenceOnboarding
  implements OnInit {

  private readonly preferenciasService =
    inject(PreferenciasService);

  private readonly toast =
    inject(ToastService);

  private readonly auth =
    inject(AuthService);


  readonly visible =
    signal(false);

  readonly cargando =
    signal(true);

  readonly guardando =
    signal(false);

  readonly personalizando =
    signal(false);

  readonly paso =
    signal(1);

  readonly categorias =
    signal<CategoriaPreferencia[]>([]);


  readonly categoriasSeleccionadas =
    signal<number[]>([]);

  readonly presupuestoMaximo =
    signal<number | null>(150);

  readonly duracionPreferidaMinutos =
    signal<number | null>(180);

  readonly horarioPreferido =
    signal<string[]>([]);

  readonly nivelActividad =
    signal('');

  readonly tipoGrupo =
    signal('');

  readonly prioridades =
    signal<string[]>([]);

  readonly restricciones =
    signal<string[]>([]);


  readonly totalPasos = 4;


  readonly progreso =
    computed(
      () =>
        (this.paso() /
          this.totalPasos) *
        100
    );


  readonly puedeContinuar =
    computed(() => {

      switch (this.paso()) {

        case 1:
          return (
            this.categoriasSeleccionadas()
              .length > 0
          );

        case 2:
          return (
            this.presupuestoMaximo() !== null &&
            this.presupuestoMaximo()! >= 0 &&
            this.duracionPreferidaMinutos() !== null &&
            this.duracionPreferidaMinutos()! > 0
          );

        case 3:
          return (
            this.horarioPreferido().length >= 1 &&
            this.horarioPreferido().length <= 2 &&
            !!this.nivelActividad()
          );

        case 4:
          return (
            !!this.tipoGrupo() &&
            this.prioridades().length > 0
          );

        default:
          return false;
      }

    });


  readonly horarios = horarios;


  readonly actividades = actividades;


  readonly grupos = grupos;


  readonly opcionesPrioridad = opcionesPrioridad;


  readonly opcionesRestriccion = opcionesRestriccion;


  ngOnInit(): void {

    if (
      this.auth.usuario()?.rol !==
      'CLIENTE'
    ) {
      this.cargando.set(false);

      return;
    }


    this.cargar();
  }


  private cargar(): void {

    this.cargando.set(true);


    forkJoin({
      preferencias:
        this.preferenciasService
          .obtener(),

      categorias:
        this.preferenciasService
          .listarCategorias()
    })
      .subscribe({

        next: ({
          preferencias,
          categorias
        }) => {

          this.categorias.set(
            categorias
          );


          if (
            !preferencias
              .preferenciasConfiguradas
          ) {

            this.visible.set(true);

          }


          this.cargando.set(false);
        },


        error: error => {

          this.cargando.set(false);

          this.toast.error(
            this.mensajeError(
              error,
              'No pudimos preparar tu experiencia personalizada.'
            )
          );
        }

      });
  }


  toggleCategoria(
    id: number
  ): void {

    const actuales =
      this.categoriasSeleccionadas();


    if (
      actuales.includes(id)
    ) {

      this.categoriasSeleccionadas.set(
        actuales.filter(
          categoriaId =>
            categoriaId !== id
        )
      );

      return;
    }


    this.categoriasSeleccionadas.set([
      ...actuales,
      id
    ]);
  }


  categoriaSeleccionada(
    id: number
  ): boolean {

    return this
      .categoriasSeleccionadas()
      .includes(id);
  }


  seleccionarHorario(
    valor: string
  ): void {

    const actuales = this.horarioPreferido();
    if (actuales.includes(valor)) {
      this.horarioPreferido.set(actuales.filter(horario => horario !== valor));
    } else if (actuales.length < 2) {
      this.horarioPreferido.set([...actuales, valor]);
    }
  }


  seleccionarActividad(
    valor: string
  ): void {

    this.nivelActividad.set(
      valor
    );
  }


  seleccionarGrupo(
    valor: string
  ): void {

    this.tipoGrupo.set(
      valor
    );
  }


  togglePrioridad(
    valor: string
  ): void {

    const actuales =
      this.prioridades();


    if (
      actuales.includes(valor)
    ) {

      this.prioridades.set(
        actuales.filter(
          item =>
            item !== valor
        )
      );

      return;
    }


    this.prioridades.set([
      ...actuales,
      valor
    ]);
  }


  toggleRestriccion(
    valor: string
  ): void {

    const actuales =
      this.restricciones();


    if (
      actuales.includes(valor)
    ) {

      this.restricciones.set(
        actuales.filter(
          item =>
            item !== valor
        )
      );

      return;
    }


    this.restricciones.set([
      ...actuales,
      valor
    ]);
  }


  siguiente(): void {

    if (
      !this.puedeContinuar()
    ) {
      return;
    }


    if (
      this.paso() <
      this.totalPasos
    ) {

      this.paso.update(
        valor =>
          valor + 1
      );

      return;
    }


    this.finalizar();
  }


  anterior(): void {

    if (
      this.paso() <= 1
    ) {
      return;
    }


    this.paso.update(
      valor =>
        valor - 1
    );
  }


  finalizar(): void {

    if (
      this.guardando() ||
      !this.puedeContinuar()
    ) {
      return;
    }


    const solicitud:
      ActualizarPreferenciasCliente = {

      categoriasFavoritas:
        this.categoriasSeleccionadas(),

      presupuestoMaximo:
        this.presupuestoMaximo(),

      horarioPreferido:
        this.horarioPreferido().map(valor => valor.trim()),

      duracionPreferidaMinutos:
        this.duracionPreferidaMinutos(),

      nivelActividad:
        this.nivelActividad().trim(),

      tipoGrupo:
        this.tipoGrupo().trim(),

      prioridades:
        this.prioridades().map(valor => valor.trim()),

      restricciones:
        this.restricciones().map(valor => valor.trim())
    };


    this.guardando.set(true);


    this.preferenciasService
      .guardar(solicitud)
      .subscribe({

        next: () => {

          this.guardando.set(false);

          this.personalizando.set(
            true
          );


          window.setTimeout(
            () => {

              this.personalizando.set(
                false
              );

              this.visible.set(
                false
              );

            },
            1800
          );
        },


        error: error => {

          this.guardando.set(false);

          this.toast.error(
            this.mensajeError(
              error,
              'No pudimos guardar tus preferencias.'
            )
          );
        }

      });
  }


  private mensajeError(
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


    const mensajes: string[] = [];
    const agregar = (valor: unknown, campo = ''): void => {
      if (typeof valor === 'string' && valor.trim()) {
        mensajes.push(campo ? `${campo}: ${valor}` : valor);
      } else if (Array.isArray(valor)) {
        valor.forEach(item => agregar(item, campo));
      } else if (valor && typeof valor === 'object') {
        const detalle = valor as Record<string, unknown>;
        const nombre = detalle['field'] ?? detalle['campo'] ?? detalle['propertyPath'] ?? campo;
        const mensaje = detalle['defaultMessage'] ?? detalle['message'] ?? detalle['mensaje'] ?? detalle['detail'];
        if (mensaje !== undefined) {
          agregar(mensaje, typeof nombre === 'string' ? nombre : campo);
        } else {
          Object.entries(detalle).forEach(([clave, contenido]) => agregar(contenido, clave));
        }
      }
    };

    for (const errores of [respuesta?.errors, respuesta?.errores, respuesta?.fieldErrors,
      respuesta?.violations, respuesta?.properties?.errors]) {
      agregar(errores);
    }
    const detalle = respuesta?.detail ?? respuesta?.mensaje ?? respuesta?.message;
    if (typeof detalle === 'string' && detalle.trim()) mensajes.unshift(detalle);
    return [...new Set(mensajes)].join('\n') || respaldo;
  }

}
