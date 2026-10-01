import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../services/auth.service';

import {
  PreferenciasService,
  ActualizarPreferenciasCliente,
  CategoriaPreferencia
} from '../../services/preferencias.service';

import {
  horarios,
  actividades,
  grupos,
  opcionesPrioridad,
  opcionesRestriccion
} from '../../services/preferencias-opciones';

@Component({
  selector: 'app-perfil-cliente',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './perfil-cliente.html',
  styleUrl: './perfil-cliente.css'
})
export class PerfilCliente implements OnInit {

  readonly auth = inject(AuthService);

  private readonly preferencias =
    inject(PreferenciasService);

  readonly cargando = signal(true);
  readonly guardando = signal(false);

  readonly error = signal('');
  readonly exito = signal('');

  readonly categorias =
    signal<CategoriaPreferencia[]>([]);

  readonly horarios = horarios;
  readonly actividades = actividades;
  readonly grupos = grupos;

  readonly prioridades =
    opcionesPrioridad;

  readonly restricciones =
    opcionesRestriccion;

  readonly duraciones = [
    90,
    120,
    180,
    240,
    300
  ];

  formulario:
    ActualizarPreferenciasCliente | null =
    null;

  private formularioOriginal:
    ActualizarPreferenciasCliente | null =
    null;


  ngOnInit(): void {
    this.cargar();
  }


  cargar(): void {

    this.cargando.set(true);
    this.error.set('');
    this.exito.set('');

    forkJoin({
      datos:
        this.preferencias.obtener(),

      categorias:
        this.preferencias.listarCategorias()
    })
      .subscribe({

        next: ({
          datos,
          categorias
        }) => {

          this.formulario =
            this.copiar(datos);

          this.formularioOriginal =
            this.copiar(datos);

          this.categorias.set([
            ...categorias,

            ...datos.categoriasFavoritas

              .filter(
                id =>
                  !categorias.some(
                    categoria =>
                      categoria.id === id
                  )
              )

              .map(id => ({
                id,
                nombre:
                  `Categoría #${id} (no disponible)`
              }))
          ]);

          this.cargando.set(false);
        },


        error: error => {

          this.error.set(
            this.mensaje(error)
          );

          this.cargando.set(false);
        }

      });
  }


  toggle<T>(
    lista: T[],
    valor: T,
    maximo = Infinity
  ): void {

    if (this.guardando()) {
      return;
    }

    this.exito.set('');

    const indice =
      lista.indexOf(valor);

    if (indice >= 0) {

      lista.splice(
        indice,
        1
      );

      return;
    }

    if (
      lista.length <
      maximo
    ) {

      lista.push(valor);
    }
  }


  seleccionarActividad(
    datos: ActualizarPreferenciasCliente,
    valor: string
  ): void {

    if (this.guardando()) {
      return;
    }

    this.exito.set('');

    datos.nivelActividad =
      valor;
  }


  seleccionarGrupo(
    datos: ActualizarPreferenciasCliente,
    valor: string
  ): void {

    if (this.guardando()) {
      return;
    }

    this.exito.set('');

    datos.tipoGrupo =
      valor;
  }


  guardar(): void {

    const datos =
      this.formulario;

    if (
      !datos ||
      this.guardando() ||
      !this.hayCambios()
    ) {
      return;
    }


    this.error.set('');
    this.exito.set('');


    if (
      datos.horarioPreferido.length < 1 ||
      datos.horarioPreferido.length > 2
    ) {

      this.error.set(
        'Selecciona uno o dos horarios.'
      );

      return;
    }


    this.guardando.set(true);


    this.preferencias
      .guardar(
        this.copiar(datos)
      )
      .subscribe({

        next: respuesta => {

          this.formulario =
            this.copiar(respuesta);

          this.formularioOriginal =
            this.copiar(respuesta);

          this.guardando.set(false);

          this.exito.set(
            'Preferencias guardadas correctamente.'
          );
        },


        error: error => {

          this.error.set(
            this.mensaje(error)
          );

          this.guardando.set(false);
        }

      });
  }


  hayCambios(): boolean {

    if (
      !this.formulario ||
      !this.formularioOriginal
    ) {
      return false;
    }

    return (
      JSON.stringify(
        this.normalizar(
          this.formulario
        )
      ) !==
      JSON.stringify(
        this.normalizar(
          this.formularioOriginal
        )
      )
    );
  }


  formatoDuracion(
    minutos: number | null
  ): string {

    if (!minutos) {
      return 'Sin preferencia';
    }

    const horas =
      Math.floor(
        minutos / 60
      );

    const restantes =
      minutos % 60;

    if (
      horas > 0 &&
      restantes > 0
    ) {
      return `${horas} h ${restantes} min`;
    }

    if (horas > 0) {
      return `${horas} h`;
    }

    return `${restantes} min`;
  }


  inicial(): string {

    const nombre =
      this.auth.usuario()
        ?.nombre
        ?.trim();

    return nombre
      ? nombre.charAt(0).toUpperCase()
      : 'S';
  }


  private normalizar(
    datos:
      ActualizarPreferenciasCliente
  ): ActualizarPreferenciasCliente {

    return {
      ...datos,

      categoriasFavoritas: [
        ...datos.categoriasFavoritas
      ].sort(
        (a, b) =>
          a - b
      ),

      horarioPreferido: [
        ...datos.horarioPreferido
      ].sort(),

      prioridades: [
        ...datos.prioridades
      ].sort(),

      restricciones: [
        ...datos.restricciones
      ].sort()
    };
  }


  private copiar(
    datos:
      ActualizarPreferenciasCliente
  ): ActualizarPreferenciasCliente {

    return {

      categoriasFavoritas: [
        ...datos.categoriasFavoritas
      ],

      presupuestoMaximo:
        datos.presupuestoMaximo,

      horarioPreferido: [
        ...datos.horarioPreferido
      ],

      duracionPreferidaMinutos:
        datos.duracionPreferidaMinutos,

      nivelActividad:
        datos.nivelActividad,

      tipoGrupo:
        datos.tipoGrupo,

      prioridades: [
        ...datos.prioridades
      ],

      restricciones: [
        ...datos.restricciones
      ]
    };
  }


  private mensaje(
    error: any
  ): string {

    return (
      error?.error?.detail ??
      error?.error?.mensaje ??
      error?.error?.message ??
      'No se pudieron procesar las preferencias. Inténtalo nuevamente.'
    );
  }

}