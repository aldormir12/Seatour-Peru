import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../services/toast.service';
import { ConfirmacionService } from '../../services/confirmacion.service';

import {
  CategoriaTour,
  CategoriasService
} from '../../services/categorias.service';

@Component({
  selector: 'app-admin-categorias',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './admin-categorias.html',
  styleUrl: './admin-categorias.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCategorias {
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly categoriasService =
    inject(CategoriasService);

  readonly categorias = signal<CategoriaTour[]>([]);

  readonly cargando = signal(true);
  readonly guardando = signal(false);

  readonly busqueda = signal('');

  readonly modalAbierto = signal(false);
  readonly categoriaEditando =
    signal<CategoriaTour | null>(null);

  readonly error = signal<string | null>(null);

  nombre = '';
  descripcion = '';
  activo = true;

  get nombreNormalizado(): string {
    return this.nombre.trim().replace(/\s+/g, ' ')
      .replace(/\p{L}/u, letra => letra.toUpperCase());
  }

  get descripcionNormalizada(): string {
    return this.descripcion.trim().replace(/\s+/g, ' ');
  }

  get errorNombre(): string | null {
    const nombre = this.nombreNormalizado;
    if (!nombre) return 'El nombre es obligatorio.';
    if (nombre.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
    if (nombre.length > 255) return 'El nombre no puede superar los 255 caracteres.';
    return null;
  }

  get errorDescripcion(): string | null {
    return this.descripcionNormalizada.length > 255
      ? 'La descripción no puede superar los 255 caracteres.' : null;
  }

  get formularioInvalido(): boolean {
    return !!this.errorNombre || !!this.errorDescripcion;
  }

  readonly categoriasFiltradas = computed(() => {
    const termino =
      this.busqueda()
        .trim()
        .toLowerCase();

    if (!termino) {
      return this.categorias();
    }

    return this.categorias().filter(categoria =>
      categoria.nombre
        .toLowerCase()
        .includes(termino) ||
      categoria.descripcion
        ?.toLowerCase()
        .includes(termino)
    );
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.categoriasService
      .listarTodas()
      .subscribe({
        next: categorias => {
          this.categorias.set(categorias);
          this.cargando.set(false);
        },

        error: error => {
          this.manejarError(error, false, 'No se pudieron cargar las categorías.');
          this.cargando.set(false);
        }
      });
  }

  nueva(): void {
    this.categoriaEditando.set(null);

    this.nombre = '';
    this.descripcion = '';
    this.activo = true;

    this.error.set(null);
    this.modalAbierto.set(true);
  }

  editar(categoria: CategoriaTour): void {
    this.categoriaEditando.set(categoria);

    this.nombre = categoria.nombre;
    this.descripcion =
      categoria.descripcion ?? '';

    this.activo = categoria.activo;

    this.error.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.guardando()) {
      return;
    }

    this.modalAbierto.set(false);
    this.error.set(null);
  }

  guardar(): void {
    if (this.guardando() || this.formularioInvalido) return;
    const nombre = this.nombreNormalizado;
    const descripcion =
      this.descripcionNormalizada || null;

    if (!nombre) {
      this.error.set(
        'El nombre de la categoría es obligatorio.'
      );
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    const categoria = this.categoriaEditando();

    if (categoria) {
      this.categoriasService
        .actualizar(
          categoria.id,
          {
            nombre,
            descripcion,
            activo: categoria.activo
          }
        )
        .subscribe({
          next: actualizada => {
            this.categorias.update(lista =>
              lista.map(item =>
                item.id === actualizada.id
                  ? actualizada
                  : item
              )
            );

            this.guardando.set(false);
            this.modalAbierto.set(false);
            this.toast.success('Categoría actualizada.');
          },

          error: error =>
            this.manejarError(error)
        });

      return;
    }

    this.categoriasService
      .crear({
        nombre,
        descripcion,
        activo: this.activo
      })
      .subscribe({
        next: creada => {
          this.categorias.update(lista => [
            ...lista,
            creada
          ]);

          this.guardando.set(false);
          this.modalAbierto.set(false);
          this.toast.success('Categoría creada.');
        },

        error: error =>
          this.manejarError(error)
      });
  }

  cambiarEstado(
    categoria: CategoriaTour
  ): void {
    this.error.set(null);

    this.categoriasService
      .cambiarEstado(
        categoria.id,
        !categoria.activo
      )
      .subscribe({
        next: actualizada => {
          this.categorias.update(lista =>
            lista.map(item =>
              item.id === actualizada.id
                ? actualizada
                : item
            )
          );
          this.toast.success(actualizada.activo ? 'Categoría activada.' : 'Categoría desactivada.');
        },

        error: error =>
          this.manejarError(error, false)
      });
  }

  async eliminar(
    categoria: CategoriaTour
  ): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: 'Eliminar categoría',
      mensaje: `¿Eliminar la categoría "${categoria.nombre}"? Esta acción no se puede deshacer.`,
      variante: 'danger',
      textoConfirmar: 'Eliminar',
      textoCancelar: 'Cancelar'
    });

    if (!confirmado) {
      return;
    }

    this.error.set(null);

    this.categoriasService
      .eliminar(categoria.id)
      .subscribe({
        next: () => {
          this.categorias.update(lista =>
            lista.filter(
              item =>
                item.id !== categoria.id
            )
          );
          this.toast.success('Categoría eliminada.');
        },

        error: error =>
          this.manejarError(error, false)
      });
  }

  private manejarError(
    error: HttpErrorResponse,
    formulario = true,
    mensajeAlternativo = 'No se pudo completar la operación.'
  ): void {
    if (formulario) this.guardando.set(false);
    const detalle = typeof error.error?.detail === 'string'
      ? error.error.detail : error.error?.message;

    if (!formulario) {
      const mensaje = typeof detalle === 'string' ? detalle
        : error.status === 404 ? 'La categoría ya no existe.'
        : error.status === 409 ? 'La categoría está en uso o hay un conflicto con los datos.'
        : error.status >= 500 ? 'Ocurrió un error en el servidor. Inténtalo nuevamente.'
        : mensajeAlternativo;
      if (error.status === 409) this.toast.warning(mensaje);
      else this.toast.error(mensaje);
      return;
    }

    if (error.status === 409) {
      this.error.set(
        typeof detalle === 'string'
          ? detalle
          : 'La categoría está en uso o ya existe una con ese nombre.'
      );

      return;
    }

    this.error.set(
      typeof detalle === 'string'
        ? detalle
        : 'No se pudo completar la operación.'
    );
  }
}
