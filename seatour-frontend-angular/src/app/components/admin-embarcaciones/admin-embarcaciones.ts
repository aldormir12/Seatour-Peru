import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Embarcacion,
  EmbarcacionSolicitud,
  EmbarcacionesService
} from '../../services/embarcaciones.service';
import { catchError, firstValueFrom, map, Observable, of, shareReplay } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ToastService } from '../../services/toast.service';
import { ConfirmacionService } from '../../services/confirmacion.service';

interface FormularioEmbarcacion {
  nombre: string;
  matricula: string;
  tipo: string;
  capacidad: number | null;
  imagenUrl: string;
}

@Component({
  selector: 'app-admin-embarcaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-embarcaciones.html',
})
export class AdminEmbarcaciones implements OnInit {

  private readonly embarcacionesService = inject(EmbarcacionesService);
  private readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly imagenes = new Map<string, Observable<string>>();
  private readonly urlsImagenes = new Set<string>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.urlsImagenes.forEach(url => URL.revokeObjectURL(url));
      this.imagenes.clear();
    });
  }

  readonly embarcaciones = signal<Embarcacion[]>([]);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly subiendoImagen = signal(false);

  readonly modalAbierto = signal(false);
  readonly modoEdicion = signal(false);

  readonly embarcacionSeleccionada = signal<Embarcacion | null>(null);

  readonly busqueda = signal('');
  readonly filtroEstado = signal<'TODAS' | 'ACTIVAS' | 'INACTIVAS'>('TODAS');
  readonly filtroTipo = signal('TODOS');

  readonly archivoImagen = signal<File | null>(null);
  readonly previewImagen = signal('');

  readonly errorFormulario = signal('');

  formulario: FormularioEmbarcacion = this.formularioVacio();

  readonly tiposPermitidos = [
    { valor: 'LANCHA', nombre: 'Lancha' },
    { valor: 'LANCHA_RAPIDA', nombre: 'Lancha rápida' },
    { valor: 'YATE', nombre: 'Yate' },
    { valor: 'CATAMARAN', nombre: 'Catamarán' },
    { valor: 'BOTE_PESCA', nombre: 'Bote de pesca' },
    { valor: 'EMBARCACION_TURISTICA', nombre: 'Embarcación turística' }
  ] as const;

  nombreTipo(tipo: string | null | undefined): string {
    return this.tiposPermitidos.find(opcion => opcion.valor === tipo)?.nombre || tipo || 'Sin tipo';
  }

  readonly tipos = computed(() => {
    const tipos = this.embarcaciones()
      .map(embarcacion => embarcacion.tipo)
      .filter(tipo => !!tipo?.trim());

    return [...new Set(tipos)].sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
  });

  readonly total = computed(() => this.embarcaciones().length);

  readonly activas = computed(() =>
    this.embarcaciones().filter(embarcacion => embarcacion.activo).length
  );

  readonly inactivas = computed(() =>
    this.embarcaciones().filter(embarcacion => !embarcacion.activo).length
  );

  readonly embarcacionesFiltradas = computed(() => {
    const texto = this.normalizarBusqueda(this.busqueda());
    const estado = this.filtroEstado();
    const tipo = this.filtroTipo();

    return this.embarcaciones().filter(embarcacion => {

      const coincideBusqueda =
        !texto ||
        this.normalizarBusqueda(embarcacion.nombre).includes(texto) ||
        this.normalizarBusqueda(embarcacion.matricula).includes(texto) ||
        this.normalizarBusqueda(this.nombreTipo(embarcacion.tipo)).includes(texto);

      const coincideEstado =
        estado === 'TODAS' ||
        (estado === 'ACTIVAS' && embarcacion.activo) ||
        (estado === 'INACTIVAS' && !embarcacion.activo);

      const coincideTipo =
        tipo === 'TODOS' ||
        embarcacion.tipo === tipo;

      return coincideBusqueda && coincideEstado && coincideTipo;
    });
  });

  ngOnInit(): void {
    this.cargarEmbarcaciones();
  }

  cargarEmbarcaciones(): void {
    this.cargando.set(true);

    this.embarcacionesService.listar().subscribe({
      next: embarcaciones => {
        this.embarcaciones.set(embarcaciones);
        this.cargando.set(false);
      },
      error: error => {
        this.cargando.set(false);

        this.toast.error(
          this.obtenerMensajeError(
            error,
            'No se pudieron cargar las embarcaciones.'
          )
        );
      }
    });
  }

  abrirCrear(): void {
    this.modoEdicion.set(false);
    this.embarcacionSeleccionada.set(null);

    this.formulario = this.formularioVacio();

    this.archivoImagen.set(null);
    this.previewImagen.set('');
    this.errorFormulario.set('');

    this.modalAbierto.set(true);
  }

  abrirEditar(embarcacion: Embarcacion): void {
    this.modoEdicion.set(true);
    this.embarcacionSeleccionada.set(embarcacion);

    this.formulario = {
      nombre: embarcacion.nombre,
      matricula: embarcacion.matricula,
      tipo: this.tiposPermitidos.some(opcion => opcion.valor === embarcacion.tipo)
        ? embarcacion.tipo : '',
      capacidad: embarcacion.capacidad,
      imagenUrl: embarcacion.imagenUrl
    };

    this.archivoImagen.set(null);

    this.previewImagen.set('');

    this.errorFormulario.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.guardando() || this.subiendoImagen()) {
      return;
    }

    this.modalAbierto.set(false);
    this.errorFormulario.set('');
    this.archivoImagen.set(null);
    this.previewImagen.set('');
  }

  seleccionarImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      this.errorFormulario.set(
        'La imagen debe ser JPG, PNG o WebP.'
      );

      input.value = '';
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      this.errorFormulario.set(
        'La imagen no puede superar los 5 MB.'
      );

      input.value = '';
      return;
    }

    this.archivoImagen.set(archivo);
    this.previewImagen.set(URL.createObjectURL(archivo));
    this.errorFormulario.set('');
  }

  async guardar(): Promise<void> {
    this.errorFormulario.set('');

    const error = this.validarFormulario();

    if (error) {
      this.errorFormulario.set(error);
      return;
    }

    this.guardando.set(true);

 try {
  let imagenUrl = this.formulario.imagenUrl;

  const archivo = this.archivoImagen();

  if (archivo) {
    this.subiendoImagen.set(true);

    const respuestaImagen = await firstValueFrom(
      this.embarcacionesService.subirImagen(archivo)
    );

    this.subiendoImagen.set(false);

    if (!respuestaImagen?.imagenUrl) {
      throw new Error(
        'El servidor no devolvió la URL de la imagen.'
      );
    }

    imagenUrl = respuestaImagen.imagenUrl;
  }

      const datos: EmbarcacionSolicitud = {
        nombre: this.formulario.nombre.trim(),
        matricula: this.formulario.matricula.trim(),
        tipo: this.formulario.tipo.trim(),
        capacidad: Number(this.formulario.capacidad),
        activo: this.embarcacionSeleccionada()?.activo ?? true,
        imagenUrl
      };

      const seleccionada = this.embarcacionSeleccionada();

      if (this.modoEdicion() && seleccionada) {

        this.embarcacionesService
          .actualizar(seleccionada.id, datos)
          .subscribe({
            next: actualizada => {
              this.embarcaciones.update(lista =>
                lista.map(item =>
                  item.id === actualizada.id
                    ? actualizada
                    : item
                )
              );

              this.toast.success(
                'Embarcación actualizada correctamente.'
              );

              this.guardando.set(false);
              this.cerrarModal();
            },
            error: errorActualizacion => {
              this.guardando.set(false);
              this.subiendoImagen.set(false);

              this.errorFormulario.set(
                this.obtenerMensajeError(
                  errorActualizacion,
                  'No se pudo actualizar la embarcación.'
                )
              );
            }
          });

        return;
      }

      this.embarcacionesService.crear(datos).subscribe({
        next: creada => {
          this.embarcaciones.update(lista => [
            ...lista,
            creada
          ]);

          this.toast.success(
            'Embarcación creada correctamente.'
          );

          this.guardando.set(false);
          this.cerrarModal();
        },
        error: errorCreacion => {
          this.guardando.set(false);
          this.subiendoImagen.set(false);

          this.errorFormulario.set(
            this.obtenerMensajeError(
              errorCreacion,
              'No se pudo crear la embarcación.'
            )
          );
        }
      });

    } catch (error) {
      this.guardando.set(false);
      this.subiendoImagen.set(false);

      this.errorFormulario.set(
        'No se pudo subir la imagen de la embarcación.'
      );
    }
  }

  async cambiarEstado(embarcacion: Embarcacion): Promise<void> {

    const nuevoEstado = !embarcacion.activo;

    const aceptado = await this.confirmacion.confirmar({
      titulo: nuevoEstado
        ? 'Activar embarcación'
        : 'Desactivar embarcación',

      mensaje: nuevoEstado
        ? `¿Deseas activar "${embarcacion.nombre}"?`
        : `¿Deseas desactivar "${embarcacion.nombre}"? No podrá asignarse a nuevas salidas.`,

      variante: nuevoEstado ? 'warning' : 'danger',

      textoConfirmar: nuevoEstado
        ? 'Activar'
        : 'Desactivar'
    });

    if (!aceptado) {
      return;
    }

    this.embarcacionesService
      .cambiarEstado(embarcacion.id, nuevoEstado)
      .subscribe({
        next: actualizada => {

          this.embarcaciones.update(lista =>
            lista.map(item =>
              item.id === actualizada.id
                ? actualizada
                : item
            )
          );

          this.toast.success(
            nuevoEstado
              ? 'Embarcación activada.'
              : 'Embarcación desactivada.'
          );
        },

        error: error => {
          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudo cambiar el estado.'
            )
          );
        }
      });
  }

  async eliminar(embarcacion: Embarcacion): Promise<void> {

    const aceptado = await this.confirmacion.confirmar({
      titulo: 'Eliminar embarcación',

      mensaje:
        `¿Deseas eliminar "${embarcacion.nombre}"? ` +
        'Esta acción no se puede deshacer.',

      variante: 'danger',

      textoConfirmar: 'Eliminar'
    });

    if (!aceptado) {
      return;
    }

    this.embarcacionesService
      .eliminar(embarcacion.id)
      .subscribe({
        next: () => {

          this.embarcaciones.update(lista =>
            lista.filter(
              item => item.id !== embarcacion.id
            )
          );

          this.toast.success(
            'Embarcación eliminada correctamente.'
          );
        },

        error: error => {
          this.toast.error(
            this.obtenerMensajeError(
              error,
              'No se pudo eliminar la embarcación.'
            )
          );
        }
      });
  }

  cambiarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  cambiarFiltroEstado(
    valor: 'TODAS' | 'ACTIVAS' | 'INACTIVAS'
  ): void {
    this.filtroEstado.set(valor);
  }

  cambiarFiltroTipo(valor: string): void {
    this.filtroTipo.set(valor);
  }

  imagenDe(embarcacion: Embarcacion): Observable<string> {
    const ruta = embarcacion.imagenUrl;
    let imagen = this.imagenes.get(ruta);
    if (!imagen) {
      imagen = ruta ? this.embarcacionesService.obtenerImagen(ruta).pipe(
        takeUntilDestroyed(this.destroyRef),
        map(blob => {
          const url = URL.createObjectURL(blob);
          this.urlsImagenes.add(url);
          return url;
        }),
        catchError(() => of('')),
        shareReplay({ bufferSize: 1, refCount: true })
      ) : of('');
      this.imagenes.set(ruta, imagen);
    }
    return imagen;
  }

  private validarFormulario(): string | null {

    if (!this.formulario.nombre.trim()) {
      return 'Ingresa el nombre de la embarcación.';
    }

    if (!this.formulario.matricula.trim()) {
      return 'Ingresa la matrícula.';
    }

    if (!this.tiposPermitidos.some(opcion => opcion.valor === this.formulario.tipo)) {
      return 'Selecciona un tipo de embarcación válido.';
    }

    const capacidad = Number(this.formulario.capacidad);

    if (!Number.isInteger(capacidad)) {
      return 'La capacidad debe ser un número entero.';
    }

    if (capacidad < 1 || capacidad > 100) {
      return 'La capacidad debe estar entre 1 y 100 pasajeros.';
    }

    if (
      !this.modoEdicion() &&
      !this.archivoImagen()
    ) {
      return 'Selecciona una imagen de la embarcación.';
    }

    if (
      this.modoEdicion() &&
      !this.archivoImagen() &&
      !this.formulario.imagenUrl
    ) {
      return 'Selecciona una imagen de la embarcación.';
    }

    return null;
  }

  private formularioVacio(): FormularioEmbarcacion {
    return {
      nombre: '',
      matricula: '',
      tipo: '',
      capacidad: null,
      imagenUrl: ''
    };
  }

  private normalizarBusqueda(valor: string): string {
    return valor
      .trim()
      .toLocaleLowerCase('es');
  }

  private obtenerMensajeError(
    error: any,
    respaldo: string
  ): string {

    const respuesta = error?.error;

    if (typeof respuesta === 'string' && respuesta.trim()) {
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
