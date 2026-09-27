import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import {
  Tour,
  Tours
} from '../../services/tours';

import {
  CategoriaTour,
  CategoriasService
} from '../../services/categorias.service';

import { ToastService } from '../../services/toast.service';
import { ConfirmacionService } from '../../services/confirmacion.service';

@Component({
  selector: 'app-admin-tours',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-tours.html',
  styleUrl: './admin-tours.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminTours {
  private readonly toursService = inject(Tours);
  private readonly categoriasService = inject(CategoriasService);
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly destroyRef = inject(DestroyRef);
  private archivoImagen: File | null = null;
  readonly previewImagen = signal('');

  urlImagen(ruta: string): string { return this.toursService.urlImagen(ruta); }

  private limpiarSeleccion(): void {
    const preview = this.previewImagen();
    if (preview) URL.revokeObjectURL(preview);
    this.previewImagen.set('');
    this.archivoImagen = null;
  }

  seleccionarImagen(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    this.limpiarSeleccion();
    if (!/\.(jpe?g|png|webp)$/i.test(archivo.name)
        || !['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      input.value = '';
      this.toast.error('Selecciona una imagen JPG, JPEG, PNG o WEBP.');
      return;
    }
    if (!archivo.size || archivo.size > 5 * 1024 * 1024) {
      input.value = '';
      this.toast.error('La imagen debe contener datos y no superar los 5 MB.');
      return;
    }
    this.archivoImagen = archivo;
    this.previewImagen.set(URL.createObjectURL(archivo));
  }

  readonly tours = signal<Tour[]>([]);
  readonly categorias = signal<CategoriaTour[]>([]);

  readonly cargando = signal(true);
  readonly guardando = signal(false);

  readonly busqueda = signal('');
  readonly filtroCategoria = signal<number | null>(null);
  readonly filtroEstado =
    signal<'todos' | 'activos' | 'inactivos'>('todos');

  readonly modalAbierto = signal(false);
  readonly tourEditando = signal<Tour | null>(null);

  readonly errorFormulario = signal<string | null>(null);

  nombre = '';
  descripcion = '';
  duracionMinutos: number | null = null;
  precioBase: number | null = null;
  categoriaId: number | null = null;
  imagenUrl = '';
  activo = true;

  readonly toursFiltrados = computed(() => {
    const texto = this.busqueda()
      .trim()
      .toLowerCase();

    const categoria = this.filtroCategoria();
    const estado = this.filtroEstado();

    return this.tours().filter(tour => {
      const coincideTexto =
        !texto ||
        tour.nombre.toLowerCase().includes(texto) ||
        tour.descripcion.toLowerCase().includes(texto);

      const coincideCategoria =
        categoria === null ||
        tour.categoriaId === categoria;

      const coincideEstado =
        estado === 'todos' ||
        (estado === 'activos' && tour.activo) ||
        (estado === 'inactivos' && !tour.activo);

      return (
        coincideTexto &&
        coincideCategoria &&
        coincideEstado
      );
    });
  });

  readonly categoriasFormulario = computed(() => {
    const editando = this.tourEditando();

    return this.categorias().filter(categoria => {
      if (categoria.activo) {
        return true;
      }

      return (
        editando !== null &&
        categoria.id === editando.categoriaId
      );
    });
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.limpiarSeleccion());
    this.cargarDatos();
  }

  get nombreNormalizado(): string {
    return this.normalizarNombre(this.nombre);
  }

  get descripcionNormalizada(): string {
    return this.normalizarTexto(this.descripcion);
  }

  get nombreError(): string | null {
    const valor = this.nombreNormalizado;

    if (!valor) {
      return 'El nombre es obligatorio.';
    }

    if (valor.length < 2) {
      return 'El nombre debe tener al menos 2 caracteres.';
    }

    if (valor.length > 255) {
      return 'El nombre no puede superar los 255 caracteres.';
    }

    return null;
  }

  get descripcionError(): string | null {
    const valor = this.descripcionNormalizada;

    if (!valor) {
      return 'La descripción es obligatoria.';
    }

    if (valor.length > 1000) {
      return 'La descripción no puede superar los 1000 caracteres.';
    }

    return null;
  }

  get duracionError(): string | null {
    if (
      this.duracionMinutos === null ||
      this.duracionMinutos === undefined
    ) {
      return 'La duración es obligatoria.';
    }

    if (
      !Number.isInteger(this.duracionMinutos) ||
      this.duracionMinutos < 30 ||
      this.duracionMinutos > 720
    ) {
      return 'Duración entre 30 y 720 minutos. Usa minutos enteros.';
    }

    return null;
  }

  get precioError(): string | null {
    if (
      this.precioBase === null ||
      this.precioBase === undefined
    ) {
      return 'El precio es obligatorio.';
    }

    if (!Number.isFinite(this.precioBase) || this.precioBase < 1 || this.precioBase > 10000) {
      return 'Precio entre S/ 1.00 y S/ 10,000.00.';
    }

    const texto = String(this.precioBase);

    if (!/^\d{1,8}(\.\d{1,2})?$/.test(texto)) {
      return 'El precio admite como máximo 2 decimales.';
    }

    return null;
  }

  get categoriaError(): string | null {
    return this.categoriaId === null
      ? 'Selecciona una categoría.'
      : null;
  }

  get imagenError(): string | null {
    if (!this.tourEditando() && !this.archivoImagen && !this.imagenUrl.trim()) {
      return 'La imagen principal es obligatoria.';
    }
    if (this.imagenUrl.trim().length > 2048) {
      return 'La ruta o URL no puede superar los 2048 caracteres.';
    }

    return null;
  }

  get formularioValido(): boolean {
    return (
      !this.nombreError &&
      !this.descripcionError &&
      !this.duracionError &&
      !this.precioError &&
      !this.categoriaError &&
      !this.imagenError
    );
  }

  cargarDatos(): void {
    this.cargando.set(true);

    this.categoriasService
      .listarTodas()
      .subscribe({
        next: categorias => {
          this.categorias.set(categorias);
          this.cargarTours();
        },

        error: () => {
          this.cargando.set(false);

          this.toast.error(
            'No se pudieron cargar las categorías.'
          );
        }
      });
  }

  private cargarTours(): void {
    this.toursService
      .listarTodos()
      .subscribe({
        next: tours => {
          this.tours.set(tours);
          this.cargando.set(false);
        },

        error: () => {
          this.cargando.set(false);

          this.toast.error(
            'No se pudieron cargar los tours.'
          );
        }
      });
  }

  nuevo(): void {
    if (this.guardando()) return;
    this.limpiarSeleccion();
    this.tourEditando.set(null);

    this.nombre = '';
    this.descripcion = '';
    this.duracionMinutos = null;
    this.precioBase = null;
    this.categoriaId = null;
    this.imagenUrl = '';
    this.activo = true;

    this.errorFormulario.set(null);
    this.modalAbierto.set(true);
  }

  editar(tour: Tour): void {
    if (this.guardando()) return;
    this.limpiarSeleccion();
    this.tourEditando.set(tour);

    this.nombre = tour.nombre;
    this.descripcion = tour.descripcion;
    this.duracionMinutos = tour.duracionMinutos;
    this.precioBase = tour.precioBase;
    this.categoriaId = tour.categoriaId;
    this.imagenUrl = tour.imagenUrl ?? '';
    this.activo = tour.activo;

    this.errorFormulario.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.guardando()) {
      return;
    }

    this.modalAbierto.set(false);
    this.limpiarSeleccion();
    this.errorFormulario.set(null);
  }

  async guardar(): Promise<void> {
    if (this.guardando()) return;
    if (!this.formularioValido) {
      this.errorFormulario.set(
        'Revisa los campos marcados antes de guardar.'
      );

      return;
    }

    this.guardando.set(true);
    if (this.archivoImagen) {
      try {
        const respuesta = await firstValueFrom(this.toursService.subirImagen(this.archivoImagen));
        if (this.destroyRef.destroyed) return;
        this.imagenUrl = respuesta.imagenUrl;
        this.limpiarSeleccion();
      } catch (error) {
        if (this.destroyRef.destroyed) return;
        this.guardando.set(false);
        this.toast.error(this.obtenerMensajeError(error as HttpErrorResponse, 'No se pudo subir la imagen.'));
        return;
      }
    }

    const datos = {
      nombre: this.normalizarNombre(this.nombre),
      descripcion: this.normalizarTexto(this.descripcion),
      duracionMinutos: this.duracionMinutos as number,
      precioBase: this.precioBase as number,
      activo: this.activo,
      categoriaId: this.categoriaId as number,
      imagenUrl: this.imagenUrl.trim() || null
    };

    this.guardando.set(true);
    this.errorFormulario.set(null);

    const editando = this.tourEditando();

    if (editando) {
      this.toursService
        .actualizar(editando.id, datos)
        .subscribe({
          next: actualizado => {
            this.tours.update(lista =>
              lista.map(tour =>
                tour.id === actualizado.id
                  ? actualizado
                  : tour
              )
            );

            this.guardando.set(false);
            this.modalAbierto.set(false);

            this.toast.success(
              'Tour actualizado correctamente.'
            );
          },

          error: error =>
            this.manejarErrorFormulario(error)
        });

      return;
    }

    this.toursService
      .crear(datos)
      .subscribe({
        next: creado => {
          this.tours.update(lista => [
            ...lista,
            creado
          ]);

          this.guardando.set(false);
          this.modalAbierto.set(false);

          this.toast.success(
            'Tour creado correctamente.'
          );
        },

        error: error =>
          this.manejarErrorFormulario(error)
      });
  }

  async cambiarEstado(tour: Tour): Promise<void> {
    const activar = !tour.activo;

    const confirmado =
      await this.confirmacion.confirmar({
        titulo: activar
          ? 'Activar tour'
          : 'Desactivar tour',

        mensaje: activar
          ? `¿Deseas activar "${tour.nombre}"?`
          : `¿Deseas desactivar "${tour.nombre}"? Ya no estará disponible para nuevas operaciones.`,

        variante: 'warning',

        textoConfirmar: activar
          ? 'Activar'
          : 'Desactivar',

        textoCancelar: 'Cancelar'
      });

    if (!confirmado) {
      return;
    }

    this.toursService
      .cambiarEstado(
        tour.id,
        activar
      )
      .subscribe({
        next: actualizado => {
          this.tours.update(lista =>
            lista.map(item =>
              item.id === actualizado.id
                ? actualizado
                : item
            )
          );

          this.toast.success(
            actualizado.activo
              ? 'Tour activado correctamente.'
              : 'Tour desactivado correctamente.'
          );
        },

        error: error => {
          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudo cambiar el estado del tour.'
            )
          );
        }
      });
  }

  async eliminar(tour: Tour): Promise<void> {
    const confirmado =
      await this.confirmacion.confirmar({
        titulo: 'Eliminar tour',

        mensaje:
          `¿Deseas eliminar "${tour.nombre}"? Esta acción no se puede deshacer.`,

        variante: 'danger',

        textoConfirmar: 'Eliminar',
        textoCancelar: 'Cancelar'
      });

    if (!confirmado) {
      return;
    }

    this.toursService
      .eliminar(tour.id)
      .subscribe({
        next: () => {
          this.tours.update(lista =>
            lista.filter(
              item => item.id !== tour.id
            )
          );

          this.toast.success(
            'Tour eliminado correctamente.'
          );
        },

        error: error => {
          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudo eliminar el tour.'
            )
          );
        }
      });
  }

  nombreCategoria(categoriaId: number): string {
    return (
      this.categorias()
        .find(categoria =>
          categoria.id === categoriaId
        )
        ?.nombre ??
      'Sin categoría'
    );
  }

  formatoDuracion(minutos: number): string {
    if (minutos < 60) {
      return `${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    if (resto === 0) {
      return `${horas} h`;
    }

    return `${horas} h ${resto} min`;
  }

  formatoPrecio(precio: number): string {
    return new Intl.NumberFormat(
      'es-PE',
      {
        style: 'currency',
        currency: 'PEN'
      }
    ).format(precio);
  }

  private manejarErrorFormulario(
    error: HttpErrorResponse
  ): void {
    this.guardando.set(false);

    this.errorFormulario.set(
      this.obtenerMensajeError(
        error,
        'No se pudo guardar el tour.'
      )
    );
  }

  private obtenerMensajeError(
    error: HttpErrorResponse,
    predeterminado: string
  ): string {
    if (
      typeof error.error?.detail === 'string'
    ) {
      return error.error.detail;
    }

    if (
      typeof error.error?.message === 'string'
    ) {
      return error.error.message;
    }

    return predeterminado;
  }

  private normalizarNombre(
    valor: string
  ): string {
    const limpio =
      this.normalizarTexto(valor);

    if (!limpio) {
      return '';
    }

    return (
      limpio.charAt(0).toUpperCase() +
      limpio.slice(1)
    );
  }

  private normalizarTexto(
    valor: string
  ): string {
    return valor
      .trim()
      .replace(/\s+/g, ' ');
  }
}
