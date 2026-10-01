import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type {
  CrearOperadorSolicitud,
  UsuarioAdministrable
} from '../../services/usuarios.service';
import { UsuariosService } from '../../services/usuarios.service';

import { AuthService } from '../../services/auth.service';
import type { RolUsuario } from '../../services/auth.service';

import { ToastService } from '../../services/toast.service';
import { ConfirmacionService } from '../../services/confirmacion.service';


interface FormularioOperador {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
}


type FiltroEstadoUsuario =
  | 'TODOS'
  | 'ACTIVOS'
  | 'INACTIVOS';


@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-usuarios.html',
  styleUrl: './admin-usuarios.css'
})
export class AdminUsuarios implements OnInit {

  private readonly usuariosService =
    inject(UsuariosService);

  private readonly toast =
    inject(ToastService);

  private readonly confirmacion =
    inject(ConfirmacionService);

  private readonly auth =
    inject(AuthService);


  readonly usuarios =
    signal<UsuarioAdministrable[]>([]);

  readonly cargando =
    signal(false);

  readonly guardando =
    signal(false);

  readonly cambiandoEstadoId =
    signal<number | null>(null);


  readonly modalAbierto =
    signal(false);

  readonly modoModal = signal<'CREAR' | 'EDITAR' | 'PASSWORD'>('CREAR');
  readonly operadorSeleccionado = signal<UsuarioAdministrable | null>(null);

  readonly errorFormulario =
    signal('');


  readonly busqueda =
    signal('');

  readonly filtroRol =
    signal<'TODOS' | RolUsuario>('TODOS');

  readonly filtroEstado =
    signal<FiltroEstadoUsuario>('TODOS');


  formulario: FormularioOperador =
    this.formularioVacio();


  readonly total = computed(
    () => this.usuarios().length
  );


  readonly clientes = computed(
    () =>
      this.usuarios().filter(
        usuario =>
          usuario.rol === 'CLIENTE'
      ).length
  );


  readonly operadores = computed(
    () =>
      this.usuarios().filter(
        usuario =>
          usuario.rol === 'OPERADOR'
      ).length
  );


  readonly administradores = computed(
    () =>
      this.usuarios().filter(
        usuario =>
          usuario.rol === 'ADMIN'
      ).length
  );


  readonly activos = computed(
    () =>
      this.usuarios().filter(
        usuario => usuario.activo
      ).length
  );


  readonly usuariosFiltrados = computed(() => {

    const texto =
      this.normalizar(this.busqueda());

    const rol =
      this.filtroRol();

    const estado =
      this.filtroEstado();


    return this.usuarios()
      .filter(usuario => {

        const nombreCompleto =
          this.normalizar(
            `${usuario.nombre} ${usuario.apellido}`
          );

        const correo =
          this.normalizar(usuario.correo);


        const coincideTexto =
          !texto ||
          nombreCompleto.includes(texto) ||
          correo.includes(texto);


        const coincideRol =
          rol === 'TODOS' ||
          usuario.rol === rol;


        const coincideEstado =
          estado === 'TODOS' ||
          (
            estado === 'ACTIVOS' &&
            usuario.activo
          ) ||
          (
            estado === 'INACTIVOS' &&
            !usuario.activo
          );


        return (
          coincideTexto &&
          coincideRol &&
          coincideEstado
        );
      })
      .sort((a, b) => {

        const nombreA =
          `${a.nombre} ${a.apellido}`;

        const nombreB =
          `${b.nombre} ${b.apellido}`;

        return nombreA.localeCompare(
          nombreB,
          'es'
        );
      });
  });


  ngOnInit(): void {
    this.cargarUsuarios();
  }


  cargarUsuarios(): void {

    this.cargando.set(true);

    this.usuariosService
      .listar()
      .subscribe({

        next: usuarios => {

          this.usuarios.set(usuarios);

          this.cargando.set(false);
        },

        error: error => {

          this.cargando.set(false);

          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudieron cargar los usuarios.'
            )
          );
        }
      });
  }


  abrirCrear(): void {
    this.modoModal.set('CREAR');
    this.operadorSeleccionado.set(null);

    this.formulario =
      this.formularioVacio();

    this.errorFormulario.set('');

    this.modalAbierto.set(true);
  }


  cerrarModal(): void {

    if (this.guardando()) {
      return;
    }

    this.modalAbierto.set(false);
    this.formulario = this.formularioVacio();
    this.operadorSeleccionado.set(null);

    this.errorFormulario.set('');
  }


  guardar(): void {

    if (this.guardando()) {
      return;
    }

    this.errorFormulario.set('');

    if (this.modoModal() === 'PASSWORD') {
      this.guardarPassword();
      return;
    }


    const error =
      this.validarFormulario();

    if (error) {

      this.errorFormulario.set(error);

      return;
    }


    const datos: CrearOperadorSolicitud = {

      nombre:
        this.formulario.nombre.trim(),

      apellido:
        this.formulario.apellido.trim(),

      correo:
        this.formulario.correo
          .trim()
          .toLowerCase(),

      password:
        this.formulario.password
    };


    this.guardando.set(true);


    const seleccionado = this.operadorSeleccionado();
    const editando = this.modoModal() === 'EDITAR' && seleccionado !== null;
    const solicitud = editando
      ? this.usuariosService.editarOperador(seleccionado.id, {
          nombre: datos.nombre, apellido: datos.apellido, correo: datos.correo
        })
      : this.usuariosService.crearOperador(datos);

    solicitud
      .subscribe({

        next: creado => {

          this.usuarios.update(
            lista => editando ? lista.map(item => item.id === creado.id ? creado : item) : [
              ...lista,
              creado
            ]
          );

          this.guardando.set(false);

          this.cerrarModal();

          this.toast.success(
            editando ? 'Operador actualizado correctamente.' : 'Operador creado correctamente.'
          );
        },

        error: error => {

          this.guardando.set(false);


          if (error?.status === 409) {

            this.errorFormulario.set(
              'Ya existe un usuario registrado con ese correo.'
            );

            return;
          }


          this.errorFormulario.set(
            this.obtenerMensajeError(
              error,
              editando ? 'No se pudo editar el operador.' : 'No se pudo crear el operador.'
            )
          );
        }
      });
  }


  abrirEditar(usuario: UsuarioAdministrable): void {
    this.abrirAccionOperador(usuario, 'EDITAR');
  }

  abrirPassword(usuario: UsuarioAdministrable): void {
    this.abrirAccionOperador(usuario, 'PASSWORD');
  }

  private abrirAccionOperador(usuario: UsuarioAdministrable, modo: 'EDITAR' | 'PASSWORD'): void {
    if (usuario.rol !== 'OPERADOR' || this.guardando()) return;
    this.operadorSeleccionado.set(usuario);
    this.modoModal.set(modo);
    this.formulario = modo === 'EDITAR'
      ? { nombre: usuario.nombre, apellido: usuario.apellido, correo: usuario.correo, password: '' }
      : this.formularioVacio();
    this.errorFormulario.set('');
    this.modalAbierto.set(true);
  }

  private guardarPassword(): void {
    const usuario = this.operadorSeleccionado();
    if (!usuario) return;
    if (!this.formulario.password.trim() || this.formulario.password.length > 1024) {
      this.errorFormulario.set('Ingresa una contraseña de hasta 1024 caracteres.');
      return;
    }
    this.guardando.set(true);
    this.usuariosService.restablecerPasswordOperador(usuario.id, this.formulario.password).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.toast.success('Contraseña restablecida correctamente.');
      },
      error: error => {
        this.guardando.set(false);
        this.errorFormulario.set(this.obtenerMensajeError(error, 'No se pudo restablecer la contraseña.'));
      }
    });
  }

  async cambiarEstado(
    usuario: UsuarioAdministrable
  ): Promise<void> {

    if (
      this.cambiandoEstadoId() !== null
    ) {
      return;
    }


    const nuevoEstado =
      !usuario.activo;


    if (
      !nuevoEstado &&
      this.esUsuarioActual(usuario)
    ) {

      this.toast.warning(
        'No puedes desactivar tu propia cuenta.'
      );

      return;
    }


    const accion =
      nuevoEstado
        ? 'activar'
        : 'desactivar';


    const aceptado =
      await this.confirmacion.confirmar({

        titulo:
          nuevoEstado
            ? 'Activar usuario'
            : 'Desactivar usuario',

        mensaje:
          `¿Deseas ${accion} a ` +
          `"${usuario.nombre} ${usuario.apellido}"?`,

        variante:
          nuevoEstado
            ? 'warning'
            : 'danger',

        textoConfirmar:
          nuevoEstado
            ? 'Activar'
            : 'Desactivar'
      });


    if (!aceptado) {
      return;
    }


    this.cambiandoEstadoId.set(
      usuario.id
    );


    this.usuariosService
      .cambiarEstado(
        usuario.id,
        nuevoEstado
      )
      .subscribe({

        next: actualizado => {

          this.usuarios.update(
            lista =>
              lista.map(item =>
                item.id === actualizado.id
                  ? actualizado
                  : item
              )
          );

          this.cambiandoEstadoId.set(null);

          this.toast.success(
            nuevoEstado
              ? 'Usuario activado correctamente.'
              : 'Usuario desactivado correctamente.'
          );
        },

        error: error => {

          this.cambiandoEstadoId.set(null);


          if (error?.status === 403) {

            this.toast.error(
              'No puedes desactivar tu propia cuenta de administrador.'
            );

            return;
          }


          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudo cambiar el estado del usuario.'
            )
          );
        }
      });
  }


  esUsuarioActual(
    usuario: UsuarioAdministrable
  ): boolean {

    return (
      this.auth.usuario()?.id ===
      usuario.id
    );
  }


  estaCambiandoEstado(
    usuario: UsuarioAdministrable
  ): boolean {

    return (
      this.cambiandoEstadoId() ===
      usuario.id
    );
  }


  etiquetaRol(
    rol: RolUsuario
  ): string {

    switch (rol) {

      case 'ADMIN':
        return 'Administrador';

      case 'OPERADOR':
        return 'Operador';

      case 'CLIENTE':
        return 'Cliente';
    }
  }


  iniciales(
    usuario: UsuarioAdministrable
  ): string {

    const nombre =
      usuario.nombre
        ?.trim()
        .charAt(0) ?? '';

    const apellido =
      usuario.apellido
        ?.trim()
        .charAt(0) ?? '';

    return (
      `${nombre}${apellido}`
        .toUpperCase() || '?'
    );
  }


  cambiarBusqueda(
    valor: string
  ): void {

    this.busqueda.set(valor);
  }


  cambiarFiltroRol(
    valor: string
  ): void {

    this.filtroRol.set(
      valor as
        | 'TODOS'
        | RolUsuario
    );
  }


  cambiarFiltroEstado(
    valor: string
  ): void {

    this.filtroEstado.set(
      valor as FiltroEstadoUsuario
    );
  }


  limpiarFiltros(): void {

    this.busqueda.set('');

    this.filtroRol.set('TODOS');

    this.filtroEstado.set('TODOS');
  }


  private validarFormulario():
    string | null {

    const nombre =
      this.formulario.nombre.trim();

    const apellido =
      this.formulario.apellido.trim();

    const correo =
      this.formulario.correo.trim();

    const password =
      this.formulario.password;


    if (!nombre) {
      return 'Ingresa el nombre del operador.';
    }


    if (!apellido) {
      return 'Ingresa el apellido del operador.';
    }


    if (!correo) {
      return 'Ingresa el correo electrónico.';
    }


    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!correoValido.test(correo)) {

      return 'Ingresa un correo electrónico válido.';
    }


    if (this.modoModal() === 'CREAR' && !password.trim()) {

      return 'Ingresa una contraseña.';
    }


    return null;
  }


  private formularioVacio():
    FormularioOperador {

    return {
      nombre: '',
      apellido: '',
      correo: '',
      password: ''
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


    if (respuesta?.error) {
      return respuesta.error;
    }


    return respaldo;
  }
}
