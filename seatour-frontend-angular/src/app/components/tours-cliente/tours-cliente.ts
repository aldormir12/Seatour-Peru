import { UbicacionTour } from '../ubicacion-tour/ubicacion-tour';
import {
  Component,
  DestroyRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subscription } from 'rxjs';

import { RecomendacionesComponent } from '../dashboard-cliente/recomendaciones/recomendaciones';
import { Tour, Tours } from '../../services/tours';
import { CategoriaTour, CategoriasService } from '../../services/categorias.service';
import { IntelligenceService, AfinidadIntelligence } from '../../services/intelligence.service';
import {
  SalidaProgramada,
  SalidasService
} from '../../services/salidas.service';

@Component({
  selector: 'app-tours-cliente',
  imports: [UbicacionTour,
    CurrencyPipe,
    RecomendacionesComponent
  ],
  templateUrl: './tours-cliente.html',
  styleUrl: './tours-cliente.css'
})
export class ToursCliente {
  private readonly intelligence = inject(IntelligenceService);
  readonly afinidades = signal<Partial<Record<number, AfinidadIntelligence>>>({});
  readonly errorAfinidades = signal('');
  readonly etiquetasAfinidad: Record<AfinidadIntelligence['nivel'], string> = {
    IDEAL: 'Ideal para ti', ALTA: 'Alta coincidencia', BUENA: 'Buena coincidencia',
    BAJA: 'Baja coincidencia', MUY_BAJA: 'Poca coincidencia'
  };
  readonly servicio = inject(Tours);
  @ViewChild('detalleTour') private detalleTour!: RecomendacionesComponent;
  private readonly categoriasCargadas = signal<CategoriaTour[]>([]);

  private readonly categoriasService = inject(CategoriasService);
  private readonly salidasService = inject(SalidasService);
  private readonly destroyRef = inject(DestroyRef);

  private peticionSalidas?: Subscription;

  readonly tours = signal<Tour[]>([]);
  readonly categorias = signal<Partial<Record<number, string>>>({});
  readonly categoriasDisponibles = computed(() =>
    Object.entries(this.categorias()).map(([id, nombre]) => ({
      id: Number(id),
      nombre
    }))
  );
  readonly categoriaSeleccionada = signal<number | null>(null);
  readonly busqueda = signal('');
  readonly toursFiltrados = computed(() => {
    const consulta = this.normalizarBusqueda(this.busqueda());
    const categoriaId = this.categoriaSeleccionada();

    const categorias = this.categorias();
    return this.tours().filter(tour =>
      (categoriaId === null || tour.categoriaId === categoriaId) &&
      (!consulta || [tour.nombre, tour.descripcion, categorias[tour.categoriaId] ?? '']
        .some(texto => this.normalizarBusqueda(texto).includes(consulta)))
    );
  });
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly imagenesFallidas = signal<Set<number>>(new Set());

  readonly tourSeleccionado = signal<Tour | null>(null);

  readonly salidas = signal<SalidaProgramada[]>([]);
  readonly cargandoSalidas = signal(false);
  readonly errorSalidas = signal('');

  constructor() {
    this.cargar();
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
  }

  seleccionarCategoria(id: number | null): void {
    this.categoriaSeleccionada.set(id);
  }

  private normalizarBusqueda(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  cargar(): void {
    if (this.cargando()) return;

    this.cargando.set(true);
    this.error.set('');
    this.errorAfinidades.set('');
    this.afinidades.set({});
    this.intelligence.afinidades().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: datos => this.afinidades.set(Object.fromEntries(datos.map(item => [item.tourId, item]))),
      error: () => this.errorAfinidades.set('No se pudieron cargar las coincidencias personalizadas.')
    });

    forkJoin({
      tours: this.servicio.listarActivos(),
      categorias: this.categoriasService.listarActivas()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: datos => {
          this.tours.set(
            datos.tours.filter(tour => tour.activo)
          );

          this.categoriasCargadas.set(datos.categorias);
          this.categorias.set(
            Object.fromEntries(
              datos.categorias.map(categoria => [
                categoria.id,
                categoria.nombre
              ])
            )
          );

          this.imagenesFallidas.set(new Set());
          this.cargando.set(false);
        },

        error: () => {
          this.error.set(
            'No pudimos cargar los tours. Inténtalo nuevamente.'
          );

          this.cargando.set(false);
        }
      });
  }

  abrirTour(tour: Tour): void {
    this.peticionSalidas?.unsubscribe();
    this.cargandoSalidas.set(false);
    this.tourSeleccionado.set(tour);
    this.detalleTour.abrirDetalle({
      ...tour,
      categoria: this.categoriasCargadas().find(c => c.id === tour.categoriaId) ?? null,
      salidas: [],
      proximaSalida: null,
      errorSalida: false
    });
    this.cargarSalidas(tour.id);
  }

  cargarSalidas(tourId?: number): void {
    const id = tourId ?? this.tourSeleccionado()?.id;

    if (!id || this.cargandoSalidas()) return;

    this.peticionSalidas?.unsubscribe();

    this.cargandoSalidas.set(true);
    this.errorSalidas.set('');

    this.peticionSalidas = this.salidasService
      .listarDisponiblesPorTour(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: salidas => {
          this.salidas.set(
            [...salidas].sort((a, b) =>
              `${a.fecha}T${a.horaSalida}`.localeCompare(
                `${b.fecha}T${b.horaSalida}`
              )
            )
          );

          this.detalleTour.tourSeleccionado.update(actual =>
            actual?.id === id ? {
              ...actual, salidas: this.salidas(), proximaSalida: this.salidas()[0] ?? null
            } : actual
          );
          this.cargandoSalidas.set(false);
        },

        error: () => {
          this.errorSalidas.set(
            'No pudimos consultar las salidas disponibles.'
          );
          this.detalleTour.tourSeleccionado.update(actual =>
            actual?.id === id ? { ...actual, errorSalida: true } : actual
          );

          this.cargandoSalidas.set(false);
        }
      });
  }

  imagenFallida(id: number): void {
    this.imagenesFallidas.update(
      ids => new Set([...ids, id])
    );
  }

}
